const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// PASTAS
// ==============================
const publicPath = path.join(__dirname, "public");
const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

// ==============================
// SERVIR FRONTEND
// ==============================
app.use(express.static(publicPath));

// ==============================
// CONFIG UPLOAD EXCEL
// ==============================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, "estoque.xlsx");
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();

        if (ext !== ".xlsx" && ext !== ".xls") {
            return cb(new Error("Somente arquivos Excel são permitidos"));
        }

        cb(null, true);
    }
});

// ==============================
// DEBUG UPLOAD (NOVO)
// ==============================
app.post("/upload-excel", upload.single("file"), (req, res) => {
    console.log("Arquivo recebido:", req.file);

    if (!req.file) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Nenhum arquivo enviado"
        });
    }

    res.json({
        sucesso: true,
        mensagem: "Arquivo atualizado com sucesso"
    });
});

// ==============================
// ROTA PARA BAIXAR EXCEL
// ==============================
app.get("/excel", (req, res) => {
    const filePath = path.join(uploadPath, "estoque.xlsx");

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("Nenhum arquivo enviado ainda");
    }

    res.sendFile(filePath);
});

// ==============================
// ROTA PARA ENVIAR NOVO EXCEL
// ==============================
app.post("/upload-excel", upload.single("arquivo"), (req, res) => {
    res.json({
        sucesso: true,
        mensagem: "Arquivo atualizado com sucesso"
    });
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
