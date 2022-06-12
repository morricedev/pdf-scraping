const pup = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

const {
  downloadPdfs,
  getAllLinks,
  removeFiles,
  getAllFiles,
  messagesHandler,
} = require("./utils.js");

pup.use(StealthPlugin());

const args = process.argv.slice(2);

const search = args[0];
const pages = Number(args[1] || 1);

if (!search) {
  throw new Error("Você precisa passar algum objeto de pesquisa");
}

if (typeof pages !== "number") {
  throw new Error(
    "Valor inválido para o argumento 'pages', por favor, passe um número."
  );
}

const baseUrl = "https://google.com";
const searchFor = `${search} filetype:pdf`;

(async () => {
  let pageCount = 1;

  const browser = await pup.launch({
    ignoreHTTPSErrors: true,
    headless: true,
  });
  const page = await browser.newPage();

  await page.goto(baseUrl);
  await page.type('input[name="q"]', searchFor);
  await page.click('input[name="q"]');

  await Promise.all([page.waitForNavigation(), page.keyboard.press("Enter")]);

  const pdfs = await getAllLinks(page);

  await downloadPdfs(pdfs);

  const pdfsFolder = "./temp";

  let tempFiles = [];

  let allFiles = getAllFiles();

  allFiles.forEach((file) => {
    const dataBuffer = fs.readFileSync(`${pdfsFolder}/${file}`);
    tempFiles.push({ file: dataBuffer, name: file });
  });

  await removeFiles({ files: tempFiles, folder: pdfsFolder, pages });

  if (fs.readdirSync(pdfsFolder).length > 0) {
    messagesHandler.success("Busca concluída", true);
    await browser.close();
    return;
  }

  while (pageCount < 10) {
    messagesHandler.error(
      ` Nenhum arquivo válido encontrado na página ${pageCount}, passando para a próxima`,
      true
    );

    const nextPage = await page.$eval(
      `a.fl[aria-label='Page ${pageCount + 1}']`,
      (el) => el.href
    );

    await page.goto(nextPage);

    const pdfsNextPage = await getAllLinks(page);

    await downloadPdfs(pdfsNextPage);

    tempFiles = [];

    allFiles = getAllFiles();

    allFiles.forEach((file) => {
      const dataBuffer = fs.readFileSync(`${pdfsFolder}/${file}`);
      tempFiles.push({ file: dataBuffer, name: file });
    });

    await removeFiles({ files: tempFiles, folder: pdfsFolder, pages });

    if (fs.readdirSync(pdfsFolder).length > 0) {
      messagesHandler.success("Busca concluída", true);
      await browser.close();
      return;
    }

    pageCount++;
  }

  if (fs.readdirSync(pdfsFolder).length === 0) {
    console.log("😔 Nenhum pdf válido foi encontrado");
  } else {
    console.log("✅ Busca finalizada com sucesso ");
  }

  await browser.close();
})();
