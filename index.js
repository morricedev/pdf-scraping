const pup = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios").default;
const fs = require("fs");
const pdf = require("pdf-page-counter");

pup.use(StealthPlugin());

const search = "Agonia do Eros";
const baseUrl = "https://google.com";
const searchFor = `${search} filetype:pdf`;

const pages = 96;

function getNameFromPath(url) {
  const splittedPath = url.split("/").filter(Boolean);

  const name = splittedPath[splittedPath.length - 1];

  return name.includes(".pdf") ? name : `${name}.pdf`;
}

(async () => {
  const browser = await pup.launch({
    ignoreHTTPSErrors: true,
    headless: true,
  });
  const page = await browser.newPage();

  await page.goto(baseUrl);

  await page.type('input[name="q"]', searchFor);
  await page.click('input[name="q"]');

  await Promise.all([page.waitForNavigation(), page.keyboard.press("Enter")]);

  const pdfs = await page.$$eval("div.g a", (el) =>
    el
      .map((link) => link.href)
      .filter((href) => href && !href.includes("google.com"))
  );

  for (const pdf of pdfs) {
    try {
      const response = await axios.get(pdf, {
        responseType: "stream",
        timeout: 1000 * 30,
      });

      if (response.headers["content-type"] === "application/pdf") {
        const filename = getNameFromPath(response.request.path);

        response.data.pipe(fs.createWriteStream(`./temp/${filename}`));
      }
    } catch (error) {
      console.log(`❗ERRO: Não foi possível acessar o link ${pdf}`);
    }
  }

  const pdfsFolder = "./temp";

  const tempFiles = [];

  fs.readdirSync(pdfsFolder).forEach((file) => {
    const dataBuffer = fs.readFileSync(`${pdfsFolder}/${file}`);
    tempFiles.push({ file: dataBuffer, name: file });
  });

  for (const file of tempFiles) {
    try {
      const data = await pdf(file.file);

      if (data.numpages < pages - (pages * 30) / 100) {
        fs.rmSync(`${pdfsFolder}/${file.name}`, {
          force: true,
        });
      }
    } catch (error) {
      console.log(`❗ERRO: Ocorreu um erro no arquivo ${file.name}`);
    }
  }

  await browser.close();
})();