import { exigirPermiso } from "@/lib/seguridad/autorizacion";
import { ProductosPage } from "@/components/productos/ProductosPage";

export default async function ProductosRoute() {
  const perfil = await exigirPermiso("productos.consultar");

  return (
    <ProductosPage
      rol={perfil.roles.codigo}
    />
  );
}
