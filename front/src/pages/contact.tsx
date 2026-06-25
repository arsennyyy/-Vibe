import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { config } from "@/config";
import { SITE_CONTACT } from "@/content/siteContact";
import StaticPageLayout, { pageBody, pageCard, pageLabel } from "@/components/StaticPageLayout";
import { cn } from "@/lib/utils";
import CaptchaModal from "@/components/security/CaptchaModal";

const fieldClass =
  "h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[#8B5CF6]/40";

const ContactPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCaptchaOpen(true);
  };

  const submitWithCaptcha = async (captchaToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(config.endpoints.contact, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, captchaToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Ошибка при отправке сообщения");
      }
      if (data.emailSent === false) {
        toast.warning(data.message || "Сообщение сохранено, но письмо не отправилось");
      } else {
        toast.success(data.message || "Сообщение отправлено — проверьте почту");
      }
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка при отправке");
    } finally {
      setIsLoading(false);
    }
  };

  const contacts = [
    { icon: Mail, title: "Email", value: SITE_CONTACT.email, href: `mailto:${SITE_CONTACT.email}` },
    { icon: Phone, title: "Телефон", value: SITE_CONTACT.phone, href: `tel:${SITE_CONTACT.phone.replace(/\s/g, "")}` },
    { icon: MapPin, title: "Офис", value: SITE_CONTACT.address },
    {
      icon: Clock,
      title: "Время работы",
      value: [SITE_CONTACT.hours.weekdays, SITE_CONTACT.hours.saturday, SITE_CONTACT.hours.sunday],
    },
  ];

  return (
    <StaticPageLayout
      eyebrow="Связь"
      title="Контакты"
      subtitle="Вопросы по билетам, возвратам, организации мероприятий или сотрудничеству — напишите нам, и мы ответим в течение одного рабочего дня."
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {contacts.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={pageCard}
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent border border-border flex items-center justify-center shrink-0">
                  <c.icon className="h-4 w-4 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{c.title}</p>
                  {Array.isArray(c.value) ? (
                    <ul className="space-y-1 text-sm text-foreground/80">
                      {c.value.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : c.href ? (
                    <a href={c.href} className="text-sm text-foreground hover:text-[#8B5CF6] transition-colors">
                      {c.value}
                    </a>
                  ) : (
                    <p className="text-sm text-foreground/80">{c.value}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          <p className={cn(pageBody, "px-1")}>
            Перед покупкой загляните в{" "}
            <Link to="/faq" className="text-[#8B5CF6] hover:underline">
              FAQ
            </Link>{" "}
            — там ответы на частые вопросы.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(pageCard, "lg:col-span-3")}
        >
          <h2 className="text-xl font-display font-bold text-foreground mb-6">Напишите нам</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={pageLabel}>Имя</label>
              <Input
                className={fieldClass}
                placeholder="Как к вам обращаться"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className={pageLabel}>Email</label>
              <Input
                type="email"
                className={fieldClass}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className={pageLabel}>Сообщение</label>
              <Textarea
                className={cn(fieldClass, "min-h-[140px] h-auto py-3 resize-y")}
                placeholder="Опишите вопрос: номер заказа, название концерта, суть обращения…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-white text-black hover:bg-white/90"
              disabled={isLoading}
            >
              {isLoading ? "Отправка…" : (
                <>
                  Отправить
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
      <CaptchaModal
        open={captchaOpen}
        onOpenChange={setCaptchaOpen}
        onVerified={(token) => void submitWithCaptcha(token)}
        title="Перед отправкой"
        description="Подтвердите, что вы не робот — затем сообщение уйдёт нам."
      />
    </StaticPageLayout>
  );
};

export default ContactPage;
