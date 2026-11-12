import styles from "./Ubicaciones.module.css";

const sucursales = [
  {
    numero: "01",
    nombre: "Sucursal Centro",
    direccion: "Zona de la Avenida Libertad, Higüey",
    referencia: "Área comercial del centro de la ciudad",
    mapa: "https://www.google.com/maps?q=Avenida+Libertad,+Higuey,+La+Altagracia,+Republica+Dominicana&output=embed",
  },
  {
    numero: "02",
    nombre: "Sucursal Este",
    direccion: "Zona de la Avenida Juan XXIII, Higüey",
    referencia: "Sector de actividad residencial y comercial",
    mapa: "https://www.google.com/maps?q=Avenida+Juan+XXIII,+Higuey,+La+Altagracia,+Republica+Dominicana&output=embed",
  },
  {
    numero: "03",
    nombre: "Sucursal Norte",
    direccion: "Zona de la Carretera Mella, Higüey",
    referencia: "Área de acceso y circulación hacia la zona norte",
    mapa: "https://www.google.com/maps?q=Carretera+Mella,+Higuey,+La+Altagracia,+Republica+Dominicana&output=embed",
  },
];

export default function Ubicaciones() {
  return (
    <section id="ubicacion" className={styles.seccion}>
      <div className={styles.contenedor}>
        <div className={styles.encabezado}>
          <span className={styles.etiqueta}>ESTAMOS CERCA DE TI</span>
          <h2>Nuestras ubicaciones</h2>
          <p>
            Conoce los puntos de atención de AquaControl en Higüey y encuentra
            en el mapa la zona de referencia de cada sucursal.
          </p>
        </div>

        <div className={styles.aviso}>
          <span>Información de demostración</span>
          Las sucursales y sus zonas de referencia son ilustrativas y no
          representan establecimientos comerciales verificados.
        </div>

        <div className={styles.grid}>
          {sucursales.map((sucursal) => (
            <article className={styles.tarjeta} key={sucursal.numero}>
              <div className={styles.info}>
                <span className={styles.numero}>SUCURSAL {sucursal.numero}</span>
                <h3>{sucursal.nombre}</h3>
                <p>{sucursal.direccion}</p>
                <span className={styles.referencia}>{sucursal.referencia}</span>
              </div>
              <iframe
                className={styles.mapa}
                src={sucursal.mapa}
                title={`Mapa de referencia: ${sucursal.nombre}, Higüey`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                className={styles.enlace}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sucursal.direccion + ", Higüey, República Dominicana")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver en Google Maps →
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
