const { sendEmail } = require("../utils/mailer");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const seedAdmin = async () => {
const email = "admin@gmail.com";
const plainPassword = "Admin@2024";


  // ✅ شيك هل موجود
  const [rows] = await db.execute(
    "SELECT * FROM utilisateurs WHERE email_user = ?",
    [email]
  );
  if (rows.length > 0) {
    console.log("✅ Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.execute(
  `INSERT INTO utilisateurs (nom_user, email_user, mot_de_passe_user, role, status_user)
   VALUES (?, ?, ?, ?, ?)`,
  ["Admin", email, hashedPassword, "admin", "actif"]
);
  console.log("✅ ADMIN CREATED ONCE");
};


const login = async (req, res) => {
  try {
    console.log("BODY:", req.body);

// ✅ IMPORTANT 🔥
if (!req.body) {
  return res.status(400).json({ message: "Body vide" });
}

const email = req.body.email || req.body.email_user;
const password = req.body.password || req.body.mot_de_passe_user;

    // ✅ ✅ أهم check
    if (!email || !password) {
      return res.status(400).json({ message: "Email ou mot de passe manquant" });
    }

    let [rows] = await db.query(
      "SELECT * FROM utilisateurs WHERE email_user = ?",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = rows[0];

    // ✅ ✅ حماية من crash
    if (!user.mot_de_passe_user) {
      return res.status(500).json({ message: "Password not set in DB" });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.mot_de_passe_user
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Password incorrect" });
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        email_user: user.email_user,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};




const sendPassword = async (req, res) => {
  try {
    const { email_user } = req.body;

    if (!email_user) {
      return res.status(400).json({ message: "Email manquant ❌" });
    }

    console.log("📧 EMAIL RECEIVED:", email_user);

    let [rows] = await db.query(
      "SELECT * FROM utilisateurs WHERE email_user = ?",
      [email_user]
    );

    if (!rows.length) {
        await db.query(
          "INSERT INTO utilisateurs (nom_user, email_user, role, status_user) VALUES (?, ?, 'jeune', 'actif')",
          ["temp", email_user]
        );
      console.log("✅ New user created");
    }

let code;

const [existing] = await db.query(
  "SELECT verification_code, verification_expires FROM utilisateurs WHERE email_user = ?",
  [email_user]
);

let existingUser = existing[0];
let existingCode = existingUser?.verification_code;
let expires = existingUser?.verification_expires;

if (existingCode && expires && new Date(expires) > new Date()) {
  code = existingCode;
  console.log("♻️ USING EXISTING CODE:", code);
} else {
  code = Math.floor(100000 + Math.random() * 900000);

  await db.query(
    `UPDATE utilisateurs
     SET verification_code = ?, verification_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
     WHERE email_user = ?`,
    [String(code), email_user]
  );

  console.log("🆕 NEW CODE GENERATED:", code);
}

// ✅ ارسال email (مرة واحدة فقط)
try {
  await sendEmail(
    email_user,
    "Code de vérification",
    `<h2>Votre code est: ${code}</h2>`
  );
  console.log("✅ EMAIL SENT");
} catch (err) {
  console.log("❌ EMAIL ERROR:", err.message);
}

// ✅ response بعد email
res.status(200).json({
  success: true,
  message: "Code envoyé ✅"
});


  } catch (err) {
    console.error("❌ sendPassword error:", err);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};


// ===============================
//  VERIFY CODE (TEST MODE)
// ===============================

const verifyCode = async (req, res) => {
  const { email_user, code } = req.body;

  let [rows] = await db.query(
    `SELECT * FROM utilisateurs 
     WHERE email_user = ? 
     AND TRIM(verification_code) = ?
     `,
    [email_user.trim(), String(code).trim()]
  );

  if (!rows.length) {
    return res.status(400).json({ message: "Code incorrect ❌" });
  }

  return res.json({
    success: true,
    message: " Code vérifié"
  });
};

// ===============================
// ✅ REGISTER FINAL (PRODUCTION)
// ===============================

const registerFinal = async (req, res) => {
  const { email_user, code } = req.body;

  try {
    console.log("EMAIL:", email_user);
    console.log("CODE RECEIVED:", code);

    // ✅ تحقق من الكود
    const [rows] = await db.query(
      `SELECT * FROM utilisateurs 
       WHERE email_user = ? 
       AND TRIM(verification_code) = ?
       `,
      [email_user.trim(), String(code).trim()]
    );

    if (!rows.length) {
      return res.status(400).json({
        message: "Code incorrect ou expiré ❌"
      });
    }
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE utilisateurs
       SET mot_de_passe_user = ?, verification_code = NULL
        WHERE email_user = ?`,
      [hashedPassword, email_user.trim()]
    );
    console.log("🔐 PASSWORD GENERATED:", newPassword);
    await sendEmail(
      email_user,
      "Votre mot de passe",
      `<h2>Mot de passe: ${newPassword}</h2>`
    );

    console.log("✅ PASSWORD EMAIL SENT");

    res.status(201).json({
      success: true,
      message: "✅ Inscription réussie"
    });

  } catch (err) {
    console.error("❌ registerFinal error:", err);
    res.status(500).json({ message: "Erreur serveur inscription" });
  }
};


// ✅ export خارج function
module.exports = {
  login,
  seedAdmin,
  sendPassword,
  verifyCode,
  registerFinal
};

