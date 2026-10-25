require("dotenv").config();
const fs=require("fs"),path=require("path"),readline=require("readline");
const bcrypt=require("bcryptjs"),Database=require("better-sqlite3");
const file=path.resolve(process.env.DATABASE_FILE||"./data/raqmiya.sqlite");
fs.mkdirSync(path.dirname(file),{recursive:true});
const db=new Database(file);
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','staff')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=q=>new Promise(r=>rl.question(q,r));
(async()=>{
 try{
  const username=(await ask("اسم المستخدم للمدير (3-40 حرفاً/رقماً): ")).trim();
  if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) throw Error("اسم المستخدم غير صالح.");
  const password=await ask("كلمة مرور قوية (12 حرفاً على الأقل): ");
  if(password.length<12) throw Error("كلمة المرور قصيرة جداً.");
  const hash=await bcrypt.hash(password,12);
  db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,'admin')").run(username,hash);
  console.log("تم إنشاء حساب المدير. احتفظ ببياناته بمكان آمن.");
 }catch(e){console.error("تعذر إنشاء المدير:",e.message);process.exitCode=1}
 finally{rl.close();db.close()}
})();