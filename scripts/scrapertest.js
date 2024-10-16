require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const puppeteer = require('puppeteer');
const connectDB = require('../utils/db'); // 连接数据库
const Event = require('../models/Event'); // 导入 Event 模型
const Column = require('../models/Column');
const fs = require('fs'); // 用于写文件

(async () => {
    await connectDB(); // 连接数据库
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://ourauckland.aucklandcouncil.govt.nz/events/2024/11/manly-volunteer-fire-brigade-diamond-jubilee-photographic-display/', { waitUntil: 'domcontentloaded' });
    const details = await page.evaluate(() => {
        let location = 'Location not available';
        let startTime = '00:00';
        let endTime = '00:00';
        let isFree = false;
        let tags = [];
        let dates = [];
        let externalLinks = [];

        const dateRegex = /\b(\d{1,2}\s\w+\s\d{4})\b/g; // 匹配日期格式

        // 提取 WHERE 信息
        const whereHeader = Array.from(document.querySelectorAll('.event-panel__group h3.small'))
            .find(header => header.textContent.trim().toUpperCase() === 'WHERE');
        if (whereHeader) {
            location = whereHeader.nextElementSibling?.innerText.trim() || 'Location not available';
        }

        // 提取 WHEN 信息
        const whenHeader = Array.from(document.querySelectorAll('.event-panel__group h3.small'))
            .find(header => header.textContent.trim().toUpperCase() === 'WHEN');
        if (whenHeader) {
            const dateElements = whenHeader.parentElement.querySelectorAll('p, span');
            dateElements.forEach(element => {
                const text = element.innerText.trim();

                let match;
                while ((match = dateRegex.exec(text)) !== null) {
                    dates.push(match[0]); // 存储匹配的日期
                }

                // 提取时间段
                if (text.includes('-') && (text.includes('am') || text.includes('pm'))) {
                    const [start, end] = text.split('-').map(t => t.trim());
                    startTime = start || startTime;
                    endTime = end || endTime;
                }
            });
        }

        // 提取 COST 信息
        const costHeader = Array.from(document.querySelectorAll('.event-panel__group h3.small'))
            .find(header => header.textContent.trim().toUpperCase() === 'COST');
        if (costHeader) {
            const costText = costHeader.nextElementSibling?.textContent.trim().toLowerCase() || '';
            isFree = costText.includes('free'); // 如果包含 'free'，则设置 isFree 为 true
        }

        // 提取标签
        const tagsElements = document.querySelectorAll('.event-panel-tags__item .event-panel-tags__link');
        tagsElements.forEach((tagElement) => {
            const tagText = tagElement.innerText.replace(/\n/g, '').trim();
            tags.push(tagText);
        });

        // 提取外部链接
        const linkElements = document.querySelectorAll('.event-panel__links a');
        linkElements.forEach(link => externalLinks.push(link.href));

        return { location, startTime, endTime, isFree, tags, dates, externalLinks };
    });

    const tagsWithColumnSeq = await Promise.all(
        details.tags.map(async (tagText) => {
            const column = await Column.findOne({
                columnName: 'Event category',
                columnDetail: { $regex: new RegExp(`^${tagText}$`, 'i') },
            });
            return column ? column.columnSeq : null;
        })
    );

    const validTags = tagsWithColumnSeq.filter((seq) => seq !== null);

    console.log('Details:', details);
    console.log('Valid Tags:', validTags);

    fs.writeFile('eventDetails.json', JSON.stringify(details, null, 2), (err) => {
        if (err) throw err;
        console.log('Event details saved successfully!');
    });

    await browser.close();
    process.exit(0);
})();
