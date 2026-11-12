import Link from "next/link";
import styles from "./Nosotros.module.css";

const pilares = [
  {
    numero: "01",
    titulo: "Calidad y pureza",
    descripcion: "Trabajamos para ofrecer agua purificada mediante procesos de tratamiento y controles orientados a mantener su calidad.",
  },
  {
    numero: "02",
    titulo: "Compromiso con el cliente",
    descripcion: "Escuchamos las necesidades de nuestros clientes y procuramos brindar una atención cercana, ágil y confiable.",
  },
  {
    numero: "03",
    titulo: "Servicio responsable",
    descripcion: "Promovemos buenas prácticas de higiene, manejo responsable y entregas organizadas.",
  },
];

export default function Nosotros() {
  return (
    <section id="nosotros" className={styles.seccion}>
      <div className={styles.contenedor}>
        <div className={styles.encabezado}>
          <span className={styles.etiqueta}>CONÓCENOS</span>
          <h2>Agua de calidad, confianza en cada entrega.</h2>
          <p>
            Creemos que el acceso a agua de calidad es esencial para el bienestar
            de las familias y el buen funcionamiento de los negocios. Por eso,
            trabajamos para ofrecer una experiencia de compra sencilla,
            atención cercana y un servicio pensado para nuestros clientes.
          </p>
        </div>

        <div className={styles.presentacion}>
          <div className={styles.ilustracion}>
            <div className={styles.circulo}>
              <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <path d="M50 8C50 8 19 43 19 65a31 31 0 0 0 62 0C81 43 50 8 50 8Z" />
                <path d="M35 66a15 15 0 0 0 15 15" />
              </svg>
            </div>
            <span>PUREZA · BIENESTAR · CONFIANZA</span>
          </div>

          <div className={styles.textoPresentacion}>
            <span className={styles.etiqueta}>QUIÉNES SOMOS</span>
            <h3>Un compromiso con el bienestar de cada cliente.</h3>
            <p>
              Somos una empresa dedicada a la purificación y comercialización
              de agua, enfocada en atender hogares, comercios y empresas.
              Nuestro propósito es combinar calidad, responsabilidad y
              comodidad en cada pedido.
            </p>
            <p>
              A través de nuestra tienda digital facilitamos la consulta de
              productos y la solicitud de entregas, acercando nuestro servicio
              a las personas que confían en nosotros.
            </p>
            <Link href="/#productos" className={styles.boton}>
              Conoce nuestros productos
            </Link>
          </div>
        </div>

        <div className={styles.valores}>
          <article className={styles.tarjeta}>
            <span className={styles.etiqueta}>01 / NUESTRA MISIÓN</span>
            <h3>Servir con calidad y responsabilidad.</h3>
            <p>
              Ofrecer agua purificada y soluciones de abastecimiento mediante
              procesos responsables, productos de calidad y una atención
              orientada a satisfacer las necesidades de nuestros clientes.
            </p>
          </article>

          <article className={styles.tarjeta}>
            <span className={styles.etiqueta}>02 / NUESTRA VISIÓN</span>
            <h3>Ser una marca de confianza.</h3>
            <p>
              Consolidarnos como una empresa reconocida en Higüey por la
              calidad de nuestros productos, la excelencia del servicio y
              nuestro compromiso con las comunidades que atendemos.
            </p>
          </article>
        </div>

        <div className={styles.objetivos}>
          <div>
            <span className={styles.etiqueta}>03 / NUESTROS OBJETIVOS</span>
            <h3>Mejorar cada día para servirte mejor.</h3>
          </div>
          <div className={styles.listaObjetivos}>
            {pilares.map((pilar) => (
              <article key={pilar.numero}>
                <span>{pilar.numero}</span>
                <div>
                  <h4>{pilar.titulo}</h4>
                  <p>{pilar.descripcion}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
