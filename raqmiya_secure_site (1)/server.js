require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";
const secret = process.env.SESSION_SECRET || "";
if (isProd && secret.length < 32) {
  console.error("SESSION_SECRET must be at least 32 characters in production.");
  process.exit(1);
}
if (!isProd && secret.length < 24) console.warn("WARNING: set a strong SESSION_SECRET in .env before deployment.");

const dataDir = path.resolve(path.dirname(process.env.DATABASE_FILE || "./data/raqmiya.sqlite"));
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.resolve(process.env.DATABASE_FILE || "./data/raqmiya.sqlite");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','staff')),
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sku TEXT UNIQUE,
 category TEXT NOT NULL,
 name TEXT NOT NULL,
 brand TEXT DEFAULT '',
 model TEXT NOT NULL DEFAULT '',
 part_number TEXT DEFAULT '',
 quality TEXT DEFAULT '',
 price TEXT DEFAULT '',
 supplier TEXT DEFAULT '',
 source_url TEXT DEFAULT '',
 compatibility_status TEXT NOT NULL DEFAULT 'unverified'
   CHECK(compatibility_status IN ('verified','unverified','incompatible')),
 compatibility_note TEXT NOT NULL DEFAULT 'التوافق غير متحقق منه',
 verified_by TEXT DEFAULT '',
 verified_at TEXT DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT,
 action TEXT NOT NULL,
 detail TEXT DEFAULT '',
 ip TEXT DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL
);
`);
const countUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
if (!countUsers) console.warn("No users exist. Create the first admin with: npm run create-admin");

const Store = SQLiteStoreFactory(session);
app.disable("x-powered-by");
app.set("trust proxy", isProd ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));
app.use(session({
  name: "raqmiya.sid",
  secret: secret || crypto.randomBytes(32).toString("hex"),
  store: new Store({ db: "sessions.sqlite", dir: dataDir, table: "sessions" }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: "strict", secure: isProd, maxAge: 8 * 60 * 60 * 1000 }
}));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "محاولات كثيرة. انتظر 15 دقيقة ثم أعد المحاولة." } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false });
app.use("/api", apiLimiter);
app.use(express.static(path.join(__dirname, "public"), { index: "index.html", dotfiles: "deny" }));

function audit(req, action, detail = "") {
  try { db.prepare("INSERT INTO audit_log(username,action,detail,ip) VALUES(?,?,?,?)")
    .run(req.session?.user?.username || null, action, String(detail).slice(0,500), req.ip || ""); } catch {}
}
function auth(req,res,next) {
  if (!req.session.user) return res.status(401).json({ error: "يرجى تسجيل الدخول." });
  const user = db.prepare("SELECT id,username,role,active FROM users WHERE id=?").get(req.session.user.id);
  if (!user || !user.active) { req.session.destroy(()=>{}); return res.status(401).json({error:"الحساب غير فعال."}); }
  req.session.user = user;
  next();
}
function admin(req,res,next) {
  if (req.session.user?.role !== "admin") return res.status(403).json({error:"هذه العملية للمدير فقط."});
  next();
}
function csrf(req,res,next) {
  if (["GET","HEAD","OPTIONS"].includes(req.method)) return next();
  const token = req.get("x-csrf-token");
  if (!token || !req.session.csrfToken || !crypto.timingSafeEqual(Buffer.from(token),Buffer.from(req.session.csrfToken))) {
    return res.status(403).json({error:"رمز الحماية غير صالح. حدّث الصفحة وحاول مجدداً."});
  }
  next();
}
app.use("/api", (req,res,next) => {
  if (req.path === "/login" || req.path === "/health") return next();
  auth(req,res,err => err ? next(err) : csrf(req,res,next));
});
app.get("/api/health", (req,res)=>res.json({ok:true}));
app.get("/api/me", (req,res)=> {
  if (!req.session.user) return res.json({user:null,csrfToken:null});
  const u=db.prepare("SELECT id,username,role,active FROM users WHERE id=?").get(req.session.user.id);
  if (!u || !u.active) return res.json({user:null,csrfToken:null});
  if (!req.session.csrfToken) req.session.csrfToken=crypto.randomBytes(32).toString("hex");
  res.json({user:u,csrfToken:req.session.csrfToken});
});
app.post("/api/login", loginLimiter, async (req,res) => {
  const username=String(req.body.username||"").trim();
  const password=String(req.body.password||"");
  if (!username || !password || username.length>80 || password.length>200) return res.status(400).json({error:"أدخل اسم المستخدم وكلمة المرور."});
  const user=db.prepare("SELECT * FROM users WHERE username=? COLLATE NOCASE").get(username);
  const ok=user && user.active && await bcrypt.compare(password,user.password_hash);
  if (!ok) { audit(req,"login_failed",username); return res.status(401).json({error:"بيانات الدخول غير صحيحة أو الحساب موقوف."}); }
  req.session.regenerate(err=>{
    if(err) return res.status(500).json({error:"تعذر إنشاء جلسة آمنة."});
    req.session.user={id:user.id,username:user.username,role:user.role,active:user.active};
    req.session.csrfToken=crypto.randomBytes(32).toString("hex");
    audit(req,"login_success");
    res.json({user:req.session.user,csrfToken:req.session.csrfToken});
  });
});
app.post("/api/logout",(req,res)=>{
  if(!req.session.user) return res.json({ok:true});
  audit(req,"logout");
  req.session.destroy(()=>{res.clearCookie("raqmiya.sid",{httpOnly:true,sameSite:"strict",secure:isProd});res.json({ok:true});});
});
app.get("/api/products",(req,res)=>{
  const q=String(req.query.q||"").trim().slice(0,120);
  const category=String(req.query.category||"").trim().slice(0,50);
  let sql="SELECT * FROM products WHERE 1=1", args=[];
  if(category && category!=="الكل"){sql+=" AND category=?";args.push(category);}
  if(q){sql+=" AND (name LIKE ? OR model LIKE ? OR brand LIKE ? OR part_number LIKE ? OR sku LIKE ?)"; const like="%"+q+"%";args.push(like,like,like,like,like);}
  sql+=" ORDER BY category,name LIMIT 300";
  res.json({products:db.prepare(sql).all(...args)});
});
app.get("/api/users",auth,admin,(req,res)=>res.json({users:db.prepare("SELECT id,username,role,active,created_at FROM users ORDER BY id").all()}));
app.post("/api/users",auth,admin,async(req,res)=>{
  const username=String(req.body.username||"").trim();
  const password=String(req.body.password||"");
  const role=req.body.role==="admin"?"admin":"staff";
  if(!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) return res.status(400).json({error:"اسم المستخدم 3-40 حرفاً/رقماً، ويسمح بـ . _ -"});
  if(password.length<12 || password.length>200) return res.status(400).json({error:"كلمة المرور يجب أن تكون 12 حرفاً على الأقل."});
  try {
    const hash=await bcrypt.hash(password,12);
    db.prepare("INSERT INTO users(username,password_hash,role) VALUES(?,?,?)").run(username,hash,role);
    audit(req,"user_created",`${username}:${role}`);
    res.status(201).json({ok:true});
  } catch(e){res.status(409).json({error:"اسم المستخدم موجود مسبقاً."});}
});
app.patch("/api/users/:id",admin,(req,res)=>{
  const id=Number(req.params.id), active=req.body.active?1:0;
  const target=db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if(!target) return res.status(404).json({error:"المستخدم غير موجود."});
  if(target.id===req.session.user.id && !active) return res.status(400).json({error:"لا يمكنك إيقاف حسابك الحالي."});
  if(target.role==="admin" && !active) {
    const n=db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1").get().n;
    if(n<=1) return res.status(400).json({error:"لا يمكن إيقاف آخر مدير فعّال."});
  }
  db.prepare("UPDATE users SET active=? WHERE id=?").run(active,id);
  audit(req,"user_status_changed",`${target.username}:${active?"active":"disabled"}`);
  res.json({ok:true});
});
function requireAdmin(req,res,next){if(req.session.user?.role!=="admin")return res.status(403).json({error:"هذه العملية للمدير فقط."});next();}
app.post("/api/products",requireAdmin,(req,res)=>{
  const p=req.body||{};
  const required=["category","name","model"];
  if(required.some(k=>!String(p[k]||"").trim())) return res.status(400).json({error:"القسم واسم القطعة والموديل حقول مطلوبة."});
  const status=["verified","unverified","incompatible"].includes(p.compatibility_status)?p.compatibility_status:"unverified";
  if(status==="verified" && (!p.part_number || !p.source_url || !p.verified_by)) return res.status(400).json({error:"لتمييز التوافق كمتحقق، أدخل رقم القطعة ورابط المصدر واسم من تحقق."});
  const stmt=db.prepare(`INSERT INTO products(sku,category,name,brand,model,part_number,quality,price,supplier,source_url,compatibility_status,compatibility_note,verified_by,verified_at)
  VALUES(@sku,@category,@name,@brand,@model,@part_number,@quality,@price,@supplier,@source_url,@compatibility_status,@compatibility_note,@verified_by,@verified_at)`);
  try {
    const result=stmt.run({sku:p.sku||null,category:String(p.category).slice(0,60),name:String(p.name).slice(0,180),brand:String(p.brand||"").slice(0,80),model:String(p.model).slice(0,120),part_number:String(p.part_number||"").slice(0,100),quality:String(p.quality||"").slice(0,80),price:String(p.price||"—").slice(0,40),supplier:String(p.supplier||"").slice(0,120),source_url:String(p.source_url||"").slice(0,500),compatibility_status:status,compatibility_note:String(p.compatibility_note||"التوافق غير متحقق منه").slice(0,500),verified_by:String(p.verified_by||"").slice(0,80),verified_at:status==="verified"?new Date().toISOString():""});
    audit(req,"product_created",String(result.lastInsertRowid));
    res.status(201).json({ok:true,id:result.lastInsertRowid});
  } catch(e){res.status(400).json({error:"تعذر حفظ القطعة. تحقق من البيانات ورقم SKU إن وجد."});}
});
app.get("/api/admin/audit",requireAdmin,(req,res)=>res.json({events:db.prepare("SELECT username,action,detail,ip,created_at FROM audit_log ORDER BY id DESC LIMIT 200").all()}));

// Optional supplier integration: generic GET search adapter. The supplier API must explicitly support this contract.
app.get("/api/supplier/search",requireAdmin,async(req,res)=>{
  const base=process.env.SUPPLIER_API_BASE, key=process.env.SUPPLIER_API_KEY;
  if(!base || !key) return res.status(503).json({error:"لم يتم ضبط بيانات API للمورد بعد. اطلب من المورد توثيق API أو ملف كتالوج رسمي."});
  try{
    const url=new URL("/products/search",base);
    url.searchParams.set("q",String(req.query.q||"").slice(0,100));
    const header=process.env.SUPPLIER_API_TOKEN_HEADER||"Authorization";
    const value=header.toLowerCase()==="authorization" ? `Bearer ${key}` : key;
    const response=await fetch(url,{headers:{[header]:value,"Accept":"application/json"},signal:AbortSignal.timeout(8000)});
    if(!response.ok) return res.status(502).json({error:`رد المورد غير ناجح (${response.status}).`});
    const data=await response.json();
    res.json({source:"supplier_api",data});
  }catch(e){res.status(502).json({error:"تعذر الاتصال بواجهة المورد. تحقق من عنوان API وتوثيقها."});}
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Raqmiya running on http://localhost:${PORT}`));
