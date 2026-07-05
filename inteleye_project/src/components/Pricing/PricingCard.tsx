import { motion } from "framer-motion";
import SpotlightBorder from "../SpotlightBorder";
import FeatureItem from "./FeatureItem";
import AnimatedText from "../AnimatedText";

type Feature = {
  text: string;
};

type Plan = {
  name: string;
  price: string;
  description: string;
  featured?: boolean;
  features: Feature[];
};

type Props = {
  plan: Plan;
};

export default function PricingCard({ plan }: Props) {
  return (
    <SpotlightBorder className="group h-full">

      <motion.div
        whileHover={{
          y: -8,
          scale: 1.015,
        }}
        transition={{
          duration: 0.35,
        }}
        className={`
          relative
          h-full
          rounded-[32px]
          border
          p-10
          shadow-xl
          transition-all
          ${
            plan.featured
              ? "border-[#176B52] bg-[#176B52] text-white"
              : "border-gray-200 bg-white"
          }
        `}
      >
        {/* Badge */}

        {plan.featured && (
          <div className="absolute right-8 top-8 rounded-full bg-[#D4AF37] px-4 py-1 text-sm font-semibold text-black">
            الأكثر طلبًا
          </div>
        )}

        {/* Title */}

        <h3
          className={`text-2xl font-bold ${
            plan.featured ? "text-white" : "text-[#16352B]"
          }`}
        >
          {plan.name}
        </h3>

        {/* Price */}

        <div className="mt-8 flex items-end gap-2">

          <span
            className={`text-6xl font-bold ${
              plan.featured ? "text-white" : "text-[#16352B]"
            }`}
          >
            {plan.price}
          </span>

          <span
            className={`mb-2 ${
              plan.featured
                ? "text-green-100"
                : "text-gray-500"
            }`}
          >
            ريال / شهر
          </span>

        </div>

        {/* Description */}

        <p
          className={`mt-6 leading-8 ${
            plan.featured
              ? "text-green-50"
              : "text-gray-600"
          }`}
        >
          {plan.description}
        </p>

        {/* Button */}

        <button
          className={`
            mt-10
            flex
            w-full
            items-center
            justify-center
            rounded-2xl
            py-4
            text-lg
            font-semibold
            transition-all
            duration-300
            ${
              plan.featured
                ? "bg-white text-[#176B52] hover:scale-[1.02]"
                : "bg-[#176B52] text-white hover:bg-[#14523F]"
            }
          `}
        >
          <AnimatedText>
            ابدأ الآن
          </AnimatedText>
        </button>

        {/* Divider */}

        <div
          className={`my-10 ${
            plan.featured
              ? "border-t border-white/20"
              : "border-t border-gray-200"
          }`}
        />

        {/* Features */}

        <div className="space-y-5">

          {plan.features.map((feature, index) => (
            <FeatureItem
              key={index}
              text={feature.text}
              featured={plan.featured}
            />
          ))}

        </div>

        {/* Bottom Glow */}

        <div
          className={`
            absolute
            inset-x-0
            bottom-0
            h-1
            rounded-b-[32px]
            ${
              plan.featured
                ? "bg-[#D4AF37]"
                : "bg-[#176B52]"
            }
          `}
        />

      </motion.div>

    </SpotlightBorder>
  );
}