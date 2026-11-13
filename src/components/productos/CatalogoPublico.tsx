import { connection } from "next/server";
import styles from "./CatalogoPublico.module.css";
import { obtenerCatalogoPublico } from "@/services/productos/catalogo-publico.service";

const formatoPrecio = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

export default async function CatalogoPublico() {
  await connection();

  const resultado = await obtenerCatalogoPublico();

  return (
    <section
      id="productos"
      className={styles.seccion}
    >
      <div className={styles.contenedor}>
        <div className={styles.encabezado}>
          <p className={styles.etiqueta}>NUESTROS PRODUCTOS</p>
          <h2 className={styles.titulo}>
            Productos disponibles
          </h2>
          <p className={styles.descripcion}>
            Conoce nuestros productos y consulta sus precios.
          </p>
        </div>

        {resultado.error ? (
          <div className={styles.estado}>
            <h3>No pudimos cargar el catálogo</h3>
            <p>
              Intenta consultar los productos nuevamente más tarde.
            </p>
          </div>
        ) : resultado.productos.length === 0 ? (
          <div className={styles.estado}>
            <h3>Próximamente tendremos productos disponibles</h3>
            <p>
              Estamos preparando nuestro catálogo. Vuelve a visitarnos pronto.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {resultado.productos.map((producto) => (
              <article
                key={producto.id}
                className={styles.tarjeta}
              >
                <div className={styles.imagenContenedor}>
                  {producto.imagen_url ? (
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className={styles.imagen}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.imagenVacia}>
                      <svg
                        viewBox="0 0 24 24"
                        width="54"
                        height="54"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        aria-hidden="true"
                      >
                        <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z" />
                        <path d="M8 15a4 4 0 0 0 4 4" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className={styles.detalle}>
                  <h3 className={styles.nombre}>
                    {producto.nombre}
                  </h3>

                  {producto.descripcion && (
                    <p className={styles.descripcionProducto}>
                      {producto.descripcion}
                    </p>
                  )}

                  <div className={styles.pieTarjeta}>
                    <span className={styles.precio}>
                      {formatoPrecio.format(producto.precio)}
                    </span>
                    <span className={styles.unidad}>
                      Por {producto.unidad}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
