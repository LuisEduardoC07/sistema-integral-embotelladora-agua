"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { RolSistema } from "@/types/usuarios/perfil.types";

type IconName =
  | "home" | "users" | "shield" | "history" | "settings"
  | "store" | "shopping" | "package" | "boxes" | "receipt"
  | "chart" | "user" | "clipboard" | "wallet" | "truck"
  | "droplet" | "log-out" | "menu" | "x";

type MenuItem = {
  label: string;
  icon: IconName;
  href?: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const menus: Record<RolSistema, MenuGroup[]> = {
  superusuario: [
    {
      title: "GENERAL",
      items: [
        { label: "Inicio", icon: "home", href: "/superusuario" },
        { label: "Punto de venta", icon: "store", href: "/pos" },
      ],
    },
    {
      title: "OPERACIONES",
      items: [
        { label: "Pedidos pendientes", icon: "clipboard" },
        { label: "Cajas", icon: "wallet" },
        { label: "Productos", icon: "package", href: "/productos" },
      ],
    },
    {
      title: "GESTIÃ“N COMERCIAL",
      items: [
        { label: "Ventas", icon: "shopping" },
        { label: "Facturas", icon: "receipt" },
        { label: "Reportes", icon: "chart" },
        { label: "Cajeros", icon: "users" },
      ],
    },
    {
      title: "ADMINISTRACIÃ“N",
      items: [
        { label: "Usuarios y cuentas", icon: "users", href: "/superusuario/usuarios" },
        { label: "Roles y permisos", icon: "shield", href: "/superusuario/roles-permisos" },
        { label: "AuditorÃ­a", icon: "history", href: "/superusuario/auditoria" },
      ],
    },
    {
      title: "SISTEMA",
      items: [
        { label: "Mantenimiento", icon: "settings", href: "/superusuario/mantenimiento" },
        { label: "ConfiguraciÃ³n", icon: "settings", href: "/superusuario/configuracion" },
      ],
    },
  ],
  administrador: [
    {
      title: "GENERAL",
      items: [
        { label: "Inicio", icon: "home", href: "/administrador" },
        { label: "Punto de venta", icon: "store", href: "/pos" },
        { label: "Pedidos pendientes", icon: "clipboard" },
      ],
    },
    {
      title: "PRODUCTOS",
      items: [
        { label: "Productos", icon: "package", href: "/productos" },
      ],
    },
    {
      title: "GESTIÃ“N COMERCIAL",
      items: [
        { label: "Ventas", icon: "shopping" },
        { label: "Facturas", icon: "receipt" },
        { label: "Reportes", icon: "chart" },
        { label: "Cajeros", icon: "users" },
      ],
    },
  ],
  cajero: [
    {
      title: "OPERACIONES",
      items: [
        { label: "Inicio", icon: "home", href: "/cajero" },
        { label: "Punto de venta", icon: "store", href: "/pos" },
        { label: "Pedidos pendientes", icon: "clipboard" },
        { label: "Mi caja", icon: "wallet" },
      ],
    },
    {
      title: "CONSULTAS",
      items: [
        { label: "Productos", icon: "package", href: "/productos" },
        { label: "Ventas", icon: "shopping" },
        { label: "Facturas", icon: "receipt" },
      ],
    },
  ],
  cliente: [
    {
      title: "MI TIENDA",
      items: [
        { label: "Inicio", icon: "home", href: "/cliente" },
        { label: "CatÃ¡logo", icon: "store" },
        { label: "Mis pedidos", icon: "clipboard" },
        { label: "Cotizaciones", icon: "receipt" },
      ],
    },
    {
      title: "MI CUENTA",
      items: [
        { label: "Mi perfil", icon: "user" },
      ],
    },
  ],
};

const nombresRol: Record<RolSistema, string> = {
  superusuario: "Superusuario",
  administrador: "Administrador",
  cajero: "Cajero",
  cliente: "Cliente",
};

function Icono({ name, size = 19 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
    users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4",
    history: "M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l3 2",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.76.45l-.05.06h-3.4l-.05-.06a1.7 1.7 0 0 0-1.76-.45l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.6 15l-.08-.03v-3.4l.08-.03a1.7 1.7 0 0 0-.34-1.88L9.2 9.6l1.7-2.94.08.02a1.7 1.7 0 0 0 1.76-.45l.05-.06h3.4l.05.06a1.7 1.7 0 0 0 1.76.45l.08-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.4 12l.08.03v3.4z",
    store: "M3 9h18l-2-6H5L3 9z M5 9v12h14V9 M9 21v-7h6v7 M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0",
    shopping: "M6 6h15l-2 9H8L6 3H3 M9 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M18 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
    package: "m12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9 M7.5 5.5l9 5",
    boxes: "M3 7l6-3 6 3-6 3-6-3z M3 7v7l6 3 6-3V7 M15 10l4-2 3 2-4 2-3-2z M15 10v7l4 2 3-2v-7",
    receipt: "M6 2h12v20l-3-2-3 2-3-2-3 2V2z M9 8h6 M9 12h6 M9 16h3",
    chart: "M3 3v18h18 M7 14l4-4 4 3 6-7",
    user: "M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
    clipboard: "M9 4h6l1 2h4v15H4V6h4l1-2z M9 11h6 M9 15h6",
    wallet: "M3 6a2 2 0 0 1 2-2h15v16H5a2 2 0 0 1-2-2V6z M3 7h17 M16 13h4",
    truck: "M3 6h11v12H3z M14 10h4l3 4v4h-7z M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M18 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
    droplet: "M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z",
    "log-out": "M10 17l5-5-5-5 M15 12H3 M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7",
    menu: "M3 6h18 M3 12h18 M3 18h18",
    x: "M18 6 6 18 M6 6l12 12",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function ContenidoMenu({
  rol,
  pathname,
  cerrar,
}: {
  rol: RolSistema;
  pathname: string;
  cerrar: () => void;
}) {
  return (
    <nav className="space-y-7 px-4 py-6">
      {menus[rol].map((grupo) => (
        <div key={grupo.title}>
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-500">
            {grupo.title}
          </p>

          <div className="space-y-1">
            {grupo.items.map((item) => {
              const activo = item.href === pathname;

              if (!item.href) {
                return (
                  <div
                    key={item.label}
                    title="Este mÃ³dulo estarÃ¡ disponible prÃ³ximamente"
                    className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-3 text-sm text-slate-500/80"
                  >
                    <span className="flex items-center gap-3">
                      <Icono name={item.icon} />
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-600">PRONTO</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={cerrar}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    activo
                      ? "bg-blue-500/25 text-sky-300 ring-1 ring-sky-300/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icono name={item.icon} />
                  {item.label}
                  {activo && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function NavegacionPanel({
  nombre,
  rol,
  children,
}: {
  nombre: string;
  rol: RolSistema;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuMovil, setMenuMovil] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState("");

  async function cerrarSesion() {
    setCerrando(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: errorAuth } = await supabase.auth.signOut();

      if (errorAuth) {
        setError("No fue posible cerrar la sesiÃ³n. IntÃ©ntalo de nuevo.");
        setCerrando(false);
        return;
      }

      router.replace("/iniciar-sesion");
      router.refresh();
    } catch {
      setError("OcurriÃ³ un error al cerrar la sesiÃ³n.");
      setCerrando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[270px] flex-col bg-[#0a2a5c] lg:flex">
        <div className="flex h-[82px] items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400 text-[#0a2a5c]">
            <Icono name="droplet" size={25} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">AquaControl</p>
            <p className="text-[10px] tracking-widest text-slate-400">SISTEMA INTEGRAL</p>
          </div>
        </div>

        <div className="border-b border-white/10 px-5 py-5">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">SesiÃ³n activa</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{nombre}</p>
            <p className="mt-1 text-xs text-sky-300">{nombresRol[rol]}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ContenidoMenu rol={rol} pathname={pathname} cerrar={() => setMenuMovil(false)} />
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={cerrarSesion}
            disabled={cerrando}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <Icono name="log-out" />
            {cerrando ? "Cerrando sesiÃ³n..." : "Cerrar sesiÃ³n"}
          </button>
        </div>
      </aside>

      {menuMovil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menÃº"
            onClick={() => setMenuMovil(false)}
            className="absolute inset-0 bg-slate-950/60"
          />
          <aside className="relative flex h-full w-[285px] flex-col bg-[#0a2a5c] shadow-2xl">
            <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-400 p-2 text-[#0a2a5c]">
                  <Icono name="droplet" size={22} />
                </div>
                <span className="font-bold text-white">AquaControl</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuMovil(false)}
                className="p-2 text-white"
                aria-label="Cerrar"
              >
                <Icono name="x" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ContenidoMenu rol={rol} pathname={pathname} cerrar={() => setMenuMovil(false)} />
            </div>
            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                onClick={cerrarSesion}
                disabled={cerrando}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300"
              >
                <Icono name="log-out" />
                Cerrar sesiÃ³n
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuMovil(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
              aria-label="Abrir menÃº"
            >
              <Icono name="menu" />
            </button>
            <div>
              <p className="text-xs text-slate-400">AquaControl / Panel</p>
              <p className="text-sm font-semibold text-slate-800">{nombresRol[rol]}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[190px] truncate text-sm font-semibold text-slate-700">{nombre}</p>
              <p className="text-xs text-slate-400">{nombresRol[rol]}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 ring-1 ring-blue-100">
              {nombre.trim().charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">
            {error}
          </div>
        )}

        <main style={{ containerType: "inline-size" }} className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
