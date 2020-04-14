const puppeteer = require('puppeteer');
const Jimp = require('jimp');
const Tesseract = require('tesseract.js');

const THRESHOLD = 30;

(async() => {
    console.log('getting screenshot of current stream state ...');
    await getScreenshot();
    console.log('screenshot got, processing image');
    await postProcessImage();
    console.log('Image processed, doing ocr');
    const songname = await recognizeTextTesseract();
    console.log('Found song name:', songname);
})();

async function getScreenshot() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        defaultViewport: { width: 1920, height: 1080 },
    });
    const page = await browser.newPage();

    await page.goto('https://www.youtube.com/watch?v=OyWfsDTnij8', {
        waitUntil: 'networkidle2'
    });
    await page.waitForSelector('.html5-video-player:not(.ad-showing)');
    await page.waitFor(1000);
    await page.screenshot({ path: 'example.png', clip: { x: 190, y: 115, width: 1279, height: 30 } });

    await browser.close();
}

async function postProcessImage() {
    let image = await Jimp.read('./example.png');
    image.grayscale();

    const textboxWidth = Math.min(getTextboxWidth(image, 0), getTextboxWidth(image, 29));

    image.crop(0, 0, textboxWidth, image.bitmap.height);
    image
        .invert()
        .write('./example_inverted.png');
}

function getTextboxWidth(image, scanline) {
    let textWidth = -1;

    image.scan(0, scanline, image.bitmap.width, 1, (x, y, idx) => {
        const colors = getColors(image, idx);
        if (textWidth === -1 && (colors.r > THRESHOLD || colors.g > THRESHOLD || colors.b > THRESHOLD)) {
            textWidth = x;
        }
    });

    return textWidth;
}

function getColors(image, idx) {
    return {
        r: image.bitmap.data[idx],
        g: image.bitmap.data[idx + 1],
        b: image.bitmap.data[idx + 2],
        alpha: image.bitmap.data[idx + 3],
    };
}

async function recognizeTextTesseract() {
    const worker = Tesseract.createWorker();
    
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize('./example_inverted.png');
    await worker.terminate();

    return text;
}


function promisify (method) {
    return new Promise((resolve, reject) => {
        method(function() {
            if (arguments[0]) {
                reject(arguments[0]);
            }
            resolve(Array.prototype.slice.call(arguments, 1));
        });
    })
}