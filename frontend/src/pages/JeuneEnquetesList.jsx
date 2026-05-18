import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function JeuneEnquetesList() {
  const [enquetes, setEnquetes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/enquetes")
      .then(res => {
        // ✅ نجيب كان published
        const published = res.data.filter(e => e.is_published === 1);
        setEnquetes(published);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>📋 Enquêtes disponibles</h2>

      {enquetes.length === 0 ? (
        <p>Aucune enquête disponible</p>
      ) : (
        enquetes.map(e => (
          <div key={e.id_enquete} style={{
            border: "1px solid #ddd",
            padding: 15,
            marginBottom: 10,
            borderRadius: 10
          }}>
            <h3>{e.titre}</h3>
            <p>{e.description}</p>

            <button onClick={() => navigate(`/jeune/enquete/${e.id_enquete}`)}>
              Participer →
            </button>
          </div>
        ))
      )}
    </div>
  );
}
