import { Menu, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { PrimaryButton } from "./Buttons";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 w-full z-50"
    >
      <div className="mx-auto max-w-7xl px-6 pt-5">

        <div className="
          flex
          items-center
          justify-between
          rounded-2xl
          border
          border-white/60
          bg-white/80
          backdrop-blur-xl
          shadow-lg
          px-7
          py-4
        ">

          {/* Logo */}

          <div className="flex items-center gap-4">

            <img
              src="/logo.png"
              alt="Intel Eye"
              className="w-12 h-12 object-contain"
            />

            <div>

              <h2 className="text-[#16352B] font-bold text-xl">
                Intel Eye
              </h2>

              <p className="text-xs text-gray-500">
                AI Reputation Platform
              </p>

            </div>

          </div>

          {/* Desktop Menu */}

          <nav className="hidden lg:flex items-center gap-10">

            <a
              href="#"
              className="text-gray-700 hover:text-[#176B52] transition"
            >
              الرئيسية
            </a>

            <a
              href="#features"
              className="text-gray-700 hover:text-[#176B52] transition"
            >
              المميزات
            </a>

            <a
              href="#pricing"
              className="text-gray-700 hover:text-[#176B52] transition"
            >
              الأسعار
            </a>

            <a
              href="#contact"
              className="text-gray-700 hover:text-[#176B52] transition"
            >
              تواصل
            </a>

          </nav>

          {/* Right Side */}

          <div className="flex items-center gap-4">

            <div className="hidden md:block">
              <PrimaryButton>
                ابدأ التجربة
              </PrimaryButton>
            </div>

            <button
              className="
                lg:hidden
                rounded-xl
                border
                p-2
                hover:bg-gray-100
                transition
              "
            >
              <Menu size={22} />
            </button>

          </div>

        </div>

      </div>
    </motion.header>
  );
}