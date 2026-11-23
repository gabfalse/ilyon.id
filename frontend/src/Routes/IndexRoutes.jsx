import { BrowserRouter, useRoutes } from "react-router-dom";

import PublicRoutes from "./PublicRoutes";
import AuthRoutes from "./AuthRoutes";
import AdminRoutes from "./AdminRoutes";
import BranchRoutes from "./BranchRoutes";
import TutorRoutes from "./TutorRoutes";
import ParentRoutes from "./ParentRoutes";
import UserRoutes from "./UserRoutes";

import Unauthorized from "../Pages/Unauthorized";
import NotFound from "../Pages/NotFound";

function RouteList() {
  const routes = useRoutes([
    // Halaman autentikasi
    {
      path: "/auth/*",
      element: <AuthRoutes />,
    },

    // Halaman khusus Super Admin
    {
      path: "/admin/*",
      element: <AdminRoutes />,
    },

    // Halaman khusus Admin Cabang
    {
      path: "/branch/*",
      element: <BranchRoutes />,
    },

    // Halaman khusus Tutor
    {
      path: "/tutor/*",
      element: <TutorRoutes />,
    },

    // Halaman khusus Orang Tua
    {
      path: "/parent/*",
      element: <ParentRoutes />,
    },

    // Halaman khusus User
    {
      path: "/user/*",
      element: <UserRoutes />,
    },

    // Halaman akses ditolak
    {
      path: "/unauthorized",
      element: <Unauthorized />,
    },

    // Halaman publik (diletakkan setelah route khusus)
    {
      path: "/*",
      element: <PublicRoutes />,
    },

    // Halaman tidak ditemukan
    {
      path: "*",
      element: <NotFound />,
    },
  ]);

  return routes;
}

export default function IndexRoutes() {
  return (
    <BrowserRouter>
      <RouteList />
    </BrowserRouter>
  );
}
