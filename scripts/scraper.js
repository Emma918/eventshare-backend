require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const connectDB = require('../utils/db'); // 连接数据库
const Event = require('../models/Event'); // 导入 Event 模型
const Column = require('../models/Column');
const fs = require('fs'); // 用于写文件
const {getDate } = require('../utils/dateUtils.js');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function convertTo24Hour(timeStr) {
    // 使用正则表达式解析时间字符串，例如 '8:30pm' 或 '8.30pm'
    const match = timeStr.match(/^(\d{1,2})[:.]?(\d{0,2})?\s*(am|pm)$/i);
    if (!match) return timeStr; // 如果不匹配，直接返回原字符串

    let [_, hour, minutes, period] = match;
    hour = parseInt(hour, 10);
    minutes = minutes ? parseInt(minutes, 10) : 0;

    // 如果是 pm 且小时数小于 12，转换为 24 小时制
    if (period.toLowerCase() === 'pm' && hour < 12) {
        hour += 12;
    }
    // 如果是 am 且小时数为 12，转换为 0
    if (period.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
    }

    // 格式化小时和分钟为两位数
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minutes.toString().padStart(2, '0');

    return `${hourStr}:${minuteStr}`;
}
const getNextSequence = async () => {
    const latestEvent = await Event.findOne().sort({ eventId: -1 });
    return latestEvent ? latestEvent.eventId + 1 : 1;
};

(async () => {
    await connectDB(); // 连接数据库
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let allEvents = [];
    let hasNextPage = true;

    await page.goto('https://ourauckland.aucklandcouncil.govt.nz/events/');

    while (hasNextPage) {
        await delay(5000); // 等待页面加载

        const events = await page.evaluate(() => {
            const eventElements = document.querySelectorAll('.article-tile');
            const eventList = [];

            eventElements.forEach((event) => {
                const title = event.querySelector('.article-tile__title a')?.innerText.trim();
                const date = event.querySelector('.article-tile__date')?.innerText.trim();
                const link = event.querySelector('.article-tile__title a')?.href;
                const imageSrc = event.querySelector('img')?.src;

                eventList.push({ title, date, link, imageSrc });
            });

            return eventList;
        });

        allEvents = allEvents.concat(events);

        hasNextPage = await page.evaluate(() => {
            const nextPageButton = document.querySelector('li.pagination__item.pagination__item--next a');
            if (nextPageButton) {
                nextPageButton.click();
                return true;
            }
            return false;
        });

        if (hasNextPage) {
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
    }

    // 获取每个事件的详细信息
    for (const eventData of allEvents) {
        const { title, date, description, link, imageSrc } = eventData;

        // 打开事件详情页面
        await page.goto(link, { waitUntil: 'domcontentloaded' });

        // 抓取详细信息
        const details = await page.evaluate(() => {
            let location = 'Location not available';
            let startTime = '00:00';
            let endTime = '00:00';
            let isFree = false;
            let tags = [];
            let dates = [];
            let description = '';
            const dateRegex = /\b(\d{1,2}\s\w+\s\d{4})\b/g;
            // 检查是否存在 Where 和 When 元素
            const whereHeader = Array.from(document.querySelectorAll('.event-panel__group h3.small'))
                .find(header => header.textContent.includes('Where'));
            const whenHeader = Array.from(document.querySelectorAll('.event-panel__group h3.small'))
                .find(header => header.textContent.includes('When'));
            const costHeader = Array.from(document.querySelectorAll('.event-panel__group h3.small'))
                .find(header => header.textContent.trim().toUpperCase() === 'COST');
            const tagsElements = document.querySelectorAll('.event-panel-tags__item .event-panel-tags__link');
            const articleElement = document.querySelector('article');
            if (whereHeader) {
                location = whereHeader.nextElementSibling?.innerText.trim() || null;
            }
            if (whenHeader) {
                const dateElements = whenHeader.parentElement.querySelectorAll('p, span'); // 获取日期和时间部分
                dateElements.forEach(element => {
                    const text = element.innerText.trim();
                    let match;
                    while ((match = dateRegex.exec(text)) !== null) {
                        const dateforevent = match[1]?.trim();  // 提取日期部分并修剪空格
                        if (dateforevent) {  // 检查日期是否非空
                            dates.push(dateforevent);    // 存储非空日期
                        }
                    }
                    // 检查是否是时间段
                    if (text.includes('-') && text.includes('am') || text.includes('pm')) {
                        const [start, end] = text.split('-').map(t => t.trim());
                        startTime = start || startTime;
                        endTime = end || endTime;
                    }
                });
            }
            if (costHeader) {
                const costText = costHeader.nextElementSibling?.textContent.trim().toLowerCase() || '';
                isFree = costText.includes('free'); // 如果包含 'free'，则设置 isFree 为 true
            }
            tagsElements.forEach((tagElement) => {
                const tagText = tagElement.innerText.replace(/\n/g, '')   // 去掉换行符
                    .replace(/\s*,\s*/g, ',') // 去除标签间多余空格并处理逗号
                    .trim();              // 修剪首尾空格;
                tags.push(tagText);
            });
            if (articleElement) {
                description = articleElement.innerHTML;
            }
            return { location, startTime, endTime, isFree, tags, dates,description };
        });
        // 匹配 tags 中的每个标签到数据库中的 columnSeq
        const tagsWithColumnSeq = await Promise.all(
            details.tags.map(async (tagText) => {
                const column = await Column.findOne({
                    columnName: 'Event category',
                    columnDetail: { $regex: new RegExp(`^${tagText}$`, 'i') },
                });

                return column ? column.columnSeq : null; // 如果找到匹配的 column，返回 columnSeq
            })
        );

        // 过滤掉没有匹配到的标签
        const validTags = tagsWithColumnSeq.filter((seq) => seq !== null);
        const existingEvent = await Event.findOne({
            title,
            startdate: date.split(' - ')[0],
            enddate: date.split(' - ')[1] || date.split(' - ')[0],
        });
        const startTime24 = convertTo24Hour(details.startTime);
        const endTime24 = convertTo24Hour(details.endTime);
        if (!existingEvent) {
            const newEvent = new Event({
                eventId: await getNextSequence(),
                email: 'kiwiboard.info@gmail.com',
                title,
                startdate: getDate(date.split(' - ')[0]),
                enddate:getDate(date.split(' - ')[1] || date.split(' - ')[0]),
                dates: details.dates,
                startTime: startTime24,
                endTime: endTime24,
                location: details.location,
                description: details.description,
                category: validTags, // 存储标签为 category
                isFree: details.isFree, // 设置是否免费
                link,
                images: [imageSrc],
            });

            try {
                await newEvent.save();
                console.log(`Saved event: ${title}`);
            } catch (err) {
                console.error('Error saving event:', err);
            }
        }
    }

    // 保存到 JSON 文件
    fs.writeFile('eventsList_Aucklandgovernment.json', JSON.stringify(allEvents, null, 2), (err) => {
        if (err) throw err;
        console.log('Events scraped and saved to JSON successfully!');
    });

    await browser.close();
    process.exit(0);
})();
