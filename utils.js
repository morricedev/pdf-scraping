const pdf = require("pdf-page-counter");
const axios = require("axios").default;
const fs = require("fs");

const pdfsFolder = "./temp";

const messagesHandler = {
  error: (message, space) => {
    if (space) {
      console.log("");
    }

    console.log(`❌ ${message}`);
  },
  success: (message, space) => {
    if (space) {
      console.log("");
    }

    console.log(`✅ ${message}`);
  },
  searching: (message) => {
    console.log("");
    console.log(`🔎 ${message}`);
  },
};

function getNameFromPath(url) {
  const splittedPath = url.split("/").filter(Boolean);

  const name = splittedPath[splittedPath.length - 1];

  return name.includes(".pdf") ? name : `${name}.pdf`;
}

async function getAllLinks(page) {
  messagesHandler.searching("Buscando por PDFS");

  const links = await page.$$eval("div.g a", (el) =>
    el
      .map((link) => link.href)
      .filter((href) => href && !href.includes("google.com"))
  );
  messagesHandler.searching("PDFS Encontrados, iniciando download");

  return links;
}

async function downloadPdfs(pdfs) {
  for (const pdf of pdfs) {
    try {
      const response = await axios.get(pdf, {
        responseType: "stream",
        timeout: 1000 * 30,
      });

      if (response.headers["content-type"] === "application/pdf") {
        const filename = getNameFromPath(response.request.path);

        response.data.pipe(fs.createWriteStream(`./temp/${filename}`));

        messagesHandler.success(`${filename}: download concluído`);
      }
    } catch (error) {
      //
    }
  }
}

async function removeFiles({ files, folder, pages }) {
  for (const file of files) {
    messagesHandler.error(`${file.name} inválido`);

    try {
      const data = await pdf(file.file);

      if (data.numpages < pages - (pages * 30) / 100) {
        fs.unlinkSync(`${folder}/${file.name}`);
      }
    } catch (error) {
      messagesHandler.error(
        `Ocorreu um erro ao remover o arquivo${file.name} `
      );
    }
  }
}

function getAllFiles() {
  const allFiles = fs.readdirSync(pdfsFolder);

  messagesHandler.searching(
    `Foram encontrados ${allFiles.length} pdfs, iniciando validação dos arquivos`
  );

  return allFiles;
}

module.exports = {
  downloadPdfs,
  getAllLinks,
  getNameFromPath,
  removeFiles,
  getAllFiles,
  messagesHandler,
};
