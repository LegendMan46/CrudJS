// better-sqlite3 modülünü dahil et
const Database = require('better-sqlite3');

// Veritabanı dosyasını aç veya yoksa oluştur
const db = new Database('students.db', { verbose: console.log });

// `students` tablosunu oluştur
const createTable = db.prepare(`
CREATE TABLE IF NOT EXISTS students (
    no INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL
)`);
createTable.run();

console.log('`students` tablosu başarıyla oluşturuldu veya zaten mevcut.');
