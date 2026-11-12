import styles from "./Contacto.module.css";

const telefonoDemo = "18292575688";
const telefonoVisible = "+1 (829) 257-5688";
const correoDemo = "luiseduardocastillo015@gmail.com";

export default function Contacto() {
  return (
    <section id="contacto" className={styles.seccion}>
      <div className={styles.contenedor}>
        <div className={styles.encabezado}>
          <span className={styles.etiqueta}>HABLEMOS</span>
          <h2>Estamos aquí para atenderte.</h2>
          <p>
            ¿Necesitas información sobre nuestros productos o deseas realizar
            un pedido? Nuestro equipo está preparado para ayudarte.
          </p>
        </div>

        <div className={styles.contenido}>
          <div className={styles.mensaje}>
            <span className={styles.marca}>AQUACONTROL</span>
            <h3>Tu tranquilidad comienza con un servicio confiable.</h3>
            <p>
              Comunícate con nosotros para consultar productos, solicitar
              información o conocer cómo organizar tus entregas.
            </p>
            <div className={styles.detalles}>
              <div>
                <span>LLÁMANOS</span>
                <strong>{telefonoVisible}</strong>
              </div>
              <div>
                <span>ESCRÍBENOS</span>
                <strong>{correoDemo}</strong>
              </div>
              <div>
                <span>VISÍTANOS</span>
                <strong>Higüey, La Altagracia, República Dominicana</strong>
              </div>
              <div>
                <span>HORARIO DE ATENCIÓN</span>
                <strong>Lunes a sábado · 8:00 a. m. – 6:00 p. m.</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.icono}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5Z" />
                <path d="M8 10h8M8 14h5" />
              </svg>
            </div>
            <h3>¿En qué podemos ayudarte?</h3>
            <p>
              Elige el medio de contacto que prefieras. Estaremos encantados
              de atender tu consulta.
            </p>
            <a
              className={styles.whatsapp}
              href={`https://wa.me/${telefonoDemo}?text=${encodeURIComponent("Hola, deseo información sobre los productos y servicios de AquaControl.")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contactar por WhatsApp
            </a>
            <a className={styles.correo} href={`mailto:${correoDemo}?subject=${encodeURIComponent("Consulta sobre AquaControl")}`}>
              Enviar un correo electrónico
            </a>
            <small>
              Datos ficticios utilizados exclusivamente para la demostración
              comercial del sistema.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
