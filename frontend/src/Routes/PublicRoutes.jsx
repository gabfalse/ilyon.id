import { Routes, Route } from "react-router-dom";

import PublicLayout from "../Layouts/PublicLayout";

// Public Pages
import Home from "../Pages/Public/Home";
import About from "../Pages/Public/About";
import Programs from "../Pages/Public/Programs";
import ProgramDetail from "../Pages/Public/ProgramDetail";
import Branches from "../Pages/Public/Branches";
import Gallery from "../Pages/Public/Gallery";
import Articles from "../Pages/Public/Articles";
import ArticleDetail from "../Pages/Public/ArticleDetail";
import FAQ from "../Pages/Public/FAQ";
import Contact from "../Pages/Public/Contact";

import Recruitment from "../Pages/Public/Recruitment";
import RecruitmentDetail from "../Pages/Public/RecruitmentDetail";
import RecruitmentTracking from "../Pages/Public/RecruitmentTracking";

// Error Page
import NotFound from "../Pages/NotFound";

export default function PublicRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {/* Beranda */}
        <Route index element={<Home />} />

        {/* Tentang Ilyon Academy */}
        <Route path="about" element={<About />} />

        {/* Program Pembelajaran */}
        <Route path="programs" element={<Programs />} />
        <Route path="programs/:slug" element={<ProgramDetail />} />

        {/* Cabang */}
        <Route path="branches" element={<Branches />} />

        {/* Galeri */}
        <Route path="gallery" element={<Gallery />} />

        {/* Artikel */}
        <Route path="articles" element={<Articles />} />
        <Route path="articles/:slug" element={<ArticleDetail />} />

        {/* Informasi */}
        <Route path="faq" element={<FAQ />} />
        <Route path="contact" element={<Contact />} />

        {/* Pendaftaran */}
        <Route path="recruitment" element={<Recruitment />} />
        <Route path="recruitment/tracking" element={<RecruitmentTracking />} />
        <Route path="recruitment/:vacancyId" element={<RecruitmentDetail />} />

        {/* Halaman tidak ditemukan */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
