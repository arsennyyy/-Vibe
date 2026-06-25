import { motion } from "framer-motion";
import { pageBody, pageCard, pageCardTitle } from "@/components/StaticPageLayout";

export type LegalSection = { title: string; paragraphs: string[] };

export const LegalSectionsList = ({ sections }: { sections: LegalSection[] }) => (
  <div className="space-y-4">
    {sections.map((section, index) => (
      <motion.article
        key={section.title}
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.03 }}
        className={`${pageCard} !p-5 md:!p-6`}
      >
        <h2 className={`${pageCardTitle} text-base`}>{section.title}</h2>
        {section.paragraphs.map((p, i) => (
          <p key={i} className={`${pageBody} ${i > 0 ? "mt-3" : ""}`}>
            {p}
          </p>
        ))}
      </motion.article>
    ))}
  </div>
);
