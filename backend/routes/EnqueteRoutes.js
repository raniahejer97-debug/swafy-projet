console.log(" EnqueteRoutes.js LOADED");

const express = require("express");
const router  = express.Router();
const db      = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

/* ══════════════════════════════════════════
   TEST
══════════════════════════════════════════ */
router.get("/ping", (req, res) => res.json({ ok: true }));

/* ══════════════════════════════════════════
   GET /api/enquetes/lives
══════════════════════════════════════════ */
router.get("/lives", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin seulement" });
    const [rows] = await db.query(
      `SELECT l.id, l.title, l.description, l.date
       FROM lives l
       WHERE l.host_user_id = ?
       ORDER BY l.date DESC`,
      [req.user.id_user]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /enquetes/lives", err);
    res.status(500).json({ message: "Erreur chargement lives" });
  }
});
/* ══════════════════════════════════════════
   GET /api/enquetes
   → liste de toutes les enquêtes
══════════════════════════════════════════ */
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log("ROWS:", rows);
    const [rows] = await db.query(`
      SELECT 
        e.*,
        COUNT(r.id_reponse) AS total_reponses,
        COUNT(DISTINCT r.user_id) AS reponses_count
      FROM enquetes e
      LEFT JOIN reponses_enquete r 
        ON r.enquete_id = e.id_enquete
      GROUP BY e.id_enquete
    `);

    res.json(rows);

  } catch (err) {
    console.error("❌ ERROR GET ENQUETES:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
/* ══════════════════════════════════════════
   POST /api/enquetes
   → créer une enquête
══════════════════════════════════════════ */
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin seulement" });
    const { live_id, titre, description, template } = req.body;
    if (!titre) return res.status(400).json({ message: "Titre requis" });

    const [result] = await db.query(
      "INSERT INTO enquetes (live_id, titre, description, template, date_creation) VALUES (?, ?, ?, ?, NOW())",
      [live_id || null, titre, description || null, template || "style1"]
    );
    res.status(201).json({ message: "✅ Enquête créée", id_enquete: result.insertId });
  } catch (err) {
    console.error("❌ POST /enquetes", err);
    res.status(500).json({ message: "Erreur création enquête" });
  }
});
/* ══════════════════════════════════════════
   GET /api/enquetes/detail/:id
   → détail complet avec questions
══════════════════════════════════════════ */
router.get("/detail/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
        
    const [rows] = await db.query(
      `SELECT e.*, l.title AS live_title
      FROM enquetes e
      LEFT JOIN lives l ON l.id = e.live_id
      WHERE e.id_enquete = ? AND e.is_published = 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Enquête introuvable" });

    const [qs] = await db.query(
      "SELECT * FROM questions_enquete WHERE enquete_id = ? ORDER BY id_question ASC",
      [id]
    );
    const questions = qs.map(q => {
  let opts = [];
  try {
    opts = q.options ? JSON.parse(q.options) : [];
  } catch (err) {
    console.log(" JSON ERROR OPTIONS:", q.options);
    opts = [];
  }
  return {
    ...q,
    options: opts
  };
});

    res.json({ ...rows[0], questions });
  } catch (err) {
    console.error(" GET /enquetes/detail/:id", err);
    res.status(500).json({ message: "Erreur détail enquête" });
  }
});

/* ══════════════════════════════════════════
   DELETE /api/enquetes/:id
   → supprimer une enquête
══════════════════════════════════════════ */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin seulement" });
    await db.query("DELETE FROM questions_enquete WHERE enquete_id = ?", [req.params.id]);
   await db.query("DELETE FROM reponses_enquete WHERE enquete_id = ?", [req.params.id]);
    await db.query("DELETE FROM enquetes WHERE id_enquete = ?", [req.params.id]);
    res.json({ message: "✅ Enquête supprimée" });
  } catch (err) {
    console.error("❌ DELETE /enquetes/:id", err);
    res.status(500).json({ message: "Erreur suppression" });
  }
});

/* ══════════════════════════════════════════
   POST /api/enquetes/:id/questions
   → ajouter une question  ← MANQUAIT !
══════════════════════════════════════════ */
router.post("/:id/questions", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin seulement" });
    const { texte, type, options } = req.body;
    if (!texte) return res.status(400).json({ message: "Texte requis" });

    const [result] = await db.query(
      "INSERT INTO questions_enquete (enquete_id, texte, type, options) VALUES (?, ?, ?, ?)",
      [req.params.id, texte, type || "text", JSON.stringify(options || [])]
    );
    res.status(201).json({ message: "✅ Question ajoutée", id_question: result.insertId });
  } catch (err) {
    console.error("❌ POST /:id/questions", err);
    res.status(500).json({ message: "Erreur ajout question" });
  }
});

/* ══════════════════════════════════════════
   PUT /api/enquetes/:enqueteId/questions/:qid
   → modifier une question
══════════════════════════════════════════ */
router.put("/:enqueteId/questions/:qid", verifyToken, async (req, res) => {
  try {
    const { texte, type, options } = req.body;
    await db.query(
      "UPDATE questions_enquete SET texte = ?, type = ?, options = ? WHERE id_question = ?",
      [texte, type || "text", JSON.stringify(options || []), req.params.qid]
    );
    res.json({ message: "✅ Question modifiée" });
  } catch (err) {
    console.error("❌ PUT /:enqueteId/questions/:qid", err);
    res.status(500).json({ message: "Erreur modification question" });
  }
});

/* ══════════════════════════════════════════
   DELETE /api/enquetes/:enqueteId/questions/:qid
   → supprimer une question
══════════════════════════════════════════ */
router.delete("/:enqueteId/questions/:qid", verifyToken, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM questions_enquete WHERE id_question = ?",
      [req.params.qid]
    );
    res.json({ message: "✅ Question supprimée" });
  } catch (err) {
    console.error("❌ DELETE /:enqueteId/questions/:qid", err);
    res.status(500).json({ message: "Erreur suppression question" });
  }
});

/* ══════════════════════════════════════════
   POST /api/enquetes/:id/partager
   → envoyer notification à tous les jeunes
══════════════════════════════════════════ */
router.post("/:id/partager", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin seulement" });

    const enqueteId = req.params.id;

    /* 1. récupérer l'enquête */
    const [enqueteRows] = await db.query(
      "SELECT titre FROM enquetes WHERE id_enquete = ?",
      [enqueteId]
    );
    if (!enqueteRows.length) return res.status(404).json({ message: "Enquête introuvable" });
    const titre = enqueteRows[0].titre;

    /* 2. récupérer tous les jeunes */
    const [jeunes] = await db.query(
      "SELECT id_user FROM users WHERE role = 'jeune_profiles'"
    );
    if (!jeunes.length) return res.json({ message: "Aucun jeune trouvé", sent: 0 });

    /* 3. créer une notification pour chaque jeune */
    const values = jeunes.map(j => [
      j.id_user,
      "enquete",
      `📋 Nouvelle enquête : "${titre}" — Donnez votre avis !`,
      enqueteId,
      0,         // lu = false
      new Date()
    ]);

    await db.query(
      `INSERT INTO notifications (id_user, type, message, reference_id, lu, date_creation)
       VALUES ?`,
      [values]
    );

    /* 4. marquer l'enquête comme partagée */
    await db.query(
      "UPDATE enquetes SET partagee = 1, date_partage = NOW() WHERE id_enquete = ?",
      [enqueteId]
    );

    res.json({ message: "✅ Notifications envoyées", sent: jeunes.length });
  } catch (err) {
    console.error("❌ POST /:id/partager", err);
    res.status(500).json({ message: "Erreur lors du partage" });
  }
});

router.put("/publish/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin seulement" });
    }

    const { id } = req.params;

    await db.query(
      "UPDATE enquetes SET is_published = 1 WHERE id_enquete = ?",
      [id]
    );

    res.json({ message: "✅ Enquête publiée" });

  } catch (err) {
    console.error("❌ publish error:", err);
    res.status(500).json({ message: "Erreur publication" });
  }
});



/* ════════════════════════════════════════
   POST /api/enquetes/:id/reponses
   → soumettre les réponses (jeune)
══════════════════════════════════════════ */
router.post("/:id/reponses", verifyToken, async (req, res) => {
  try {
    const enqueteId = Number(req.params.id);
    const userId = req.user.id_user || req.user.id;
    const { reponses } = req.body;

    console.log("BODY:", req.body);

    if (!reponses || reponses.length === 0) {
      return res.status(400).json({ message: "Aucune réponse" });
    }

    // ✅ CHECK: déjà répondu
    const [existing] = await db.query(
      "SELECT * FROM reponses_enquete WHERE enquete_id = ? AND user_id = ?",
      [enqueteId, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Vous avez déjà répondu" });
    }

    // ✅ INSERT
    for (const rep of reponses) {

      if (!rep.question_id || !rep.contenu) {
        console.log("❌ BAD DATA:", rep);
        continue;
      }

      await db.query(
        `INSERT INTO reponses_enquete 
         (enquete_id, question_id, user_id, contenu_reponse, heure_reponse)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          enqueteId,
          Number(rep.question_id),
          userId,
          String(rep.contenu)
        ]
      );
    }

    res.json({ message: "Réponses enregistrées" });
  } catch (err) {
    console.error("🔥 ERROR INSERT:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
/* ══════════════════════════════════════════
   GET /api/enquetes/:id/reponses
   → récupérer toutes les réponses (admin)
══════════════════════════════════════════ */
router.get("/:id/reponses", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(
      `SELECT r.*, u.nom, u.prenom
       FROM reponses_enquete r
       LEFT JOIN users u ON u.id_user = r.user_id
       WHERE r.enquete_id = ?`,
      [id]
    );

    res.json(rows);

  } catch (err) {
    console.error("❌ GET /reponses:", err);
    res.status(500).json({ message: "Erreur récupération réponses" });
  }
});
/* ══════════════════════════════════════════
   GET /api/enquetes/:id/stats
   → statistiques de l'enquête (admin)
══════════════════════════════════════════ */
router.get("/:id/stats", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    const [nb] = await db.query(
  "SELECT COUNT(DISTINCT user_id) AS nb FROM reponses_enquete WHERE enquete_id = ?",
  [id]
);
    const [qs] = await db.query(
      "SELECT * FROM questions_enquete WHERE enquete_id = ? ORDER BY id_question ASC",
      [id]
    );

    const questions = await Promise.all(qs.map(async q => {
      const [reps] = await db.query(
        `SELECT r.*, u.nom AS nom_user, u.prenom AS prenom_user
         FROM reponses_enquete r
         JOIN users u ON u.id_user = r.user_id
         WHERE r.enquete_id = ? AND r.question_id = ?`,
        [id, q.id_question]
      );

      let distribution = null;
      let opts = [];
        try {
          opts = q.options ? JSON.parse(q.options) : [];
        } catch {
          opts = [];
        }
      if (opts.length > 0) {
        distribution = {};
        opts.forEach(o => { distribution[o] = 0; });
        reps.forEach(r => {
          const parts = r.contenu_reponse.split(", ");
          parts.forEach(p => { if (distribution[p] !== undefined) distribution[p]++; });
        });
      }

      return {
        question:      { ...q, options: opts },
        nb_reponses:   reps.length,
        reponses:      reps,
        distribution,
      };
    }));

    res.json({ nb_repondants: nb[0].nb, questions });
  } catch (err) {
    console.error("❌ GET /:id/stats", err);
    res.status(500).json({ message: "Erreur stats" });
  }
});

module.exports = router;
