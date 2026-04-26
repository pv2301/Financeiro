import { useCallback } from 'react';
import { Invoice, Student, ClassInfo, ServiceItem } from '../types';

interface UseMonthlyInvoicesProps {
  students: Student[];
  classes: ClassInfo[];
  services: ServiceItem[];
  messageTemplates: {
    fixed: string;
    consumption: string;
    integral: string;
  };
  mandatorySnackBySegment: Record<string, string>;
  activeTab: string;
  integralItems: Record<string, any[]>;
  dbConsumption: any[];
}

export const useMonthlyInvoices = ({
  students,
  classes,
  services,
  messageTemplates,
  mandatorySnackBySegment,
  activeTab,
  integralItems,
  dbConsumption
}: UseMonthlyInvoicesProps) => {
  
  const formatStudentCopyId = useCallback((name: string) => {
    return name.replace(/\s+/g, "").toUpperCase() + "_";
  }, []);

  const getStudentMessage = useCallback((inv: Invoice) => {
    const s = students.find((x) => x.id === inv.studentId);
    const cls = classes.find((x) => x.id === inv.classId);
    if (!s || !cls) return "";

    let template = "";
    if (inv.billingMode === "POSTPAID_CONSUMPTION") {
      template = messageTemplates.consumption;
    } else if (
      inv.billingMode === "PREPAID_FIXED" ||
      inv.billingMode === "PREPAID_DAYS"
    ) {
      const isIntegral = activeTab === "integral" || integralItems[inv.studentId];
      template = isIntegral ? messageTemplates.integral : messageTemplates.fixed;
    } else {
      template = messageTemplates.fixed;
    }

    const mandatoryId = mandatorySnackBySegment[cls.segment];
    let mandatorySnack = services.find(svc => svc.id === mandatoryId)?.name || "LANCHE";
    
    if (mandatorySnack.toUpperCase() === "LANCHE") {
      mandatorySnack = "LANCHE NINHO";
    }

    let msg = template
      .replace(/{STUDENT_NAME}/g, s.name)
      .replace(/{CLASS_NAME}/g, cls.name)
      .replace(/{MONTH_YEAR}/g, inv.monthYear)
      .replace(/{ABSENCES}/g, String(inv.absenceDays));

    if (inv.billingMode === "POSTPAID_CONSUMPTION") {
      msg = msg.replace(/{MANDATORY_SNACK} - {MONTH_YEAR}/g, "LANCHE NINHO");
      msg = msg.replace(/{MANDATORY_SNACK}/g, "LANCHE NINHO");
    } else {
      msg = msg.replace(/{MANDATORY_SNACK}/g, mandatorySnack);
    }

    if (template.includes("{CONSUMPTION}")) {
      let consumptionText = "";
      if (inv.billingMode === "POSTPAID_CONSUMPTION") {
        const consumption = dbConsumption.find(
          (d) => d.studentId === inv.studentId,
        );
        if (consumption && consumption.summary) {
          consumptionText = Object.entries(consumption.summary)
            .sort(([nameA], [nameB]) => {
              const getPriority = (n: string) => {
                const low = n.toLowerCase();
                if (low.includes("manhã")) return 1;
                if (low.includes("almoço")) return 2;
                if (low.includes("tarde")) return 3;
                if (low.includes("integral")) return 4;
                if (low.includes("ceia")) return 5;
                return 6;
              };
              return getPriority(nameA) - getPriority(nameB);
            })
            .map(([name, qty]) => {
              const formatName = (n: string) => {
                const low = n.toLowerCase();
                if (low.includes("manhã")) return "Lanche da Manhã";
                if (low.includes("almoço")) return "Almoço";
                if (low.includes("tarde")) return "Lanche da Tarde";
                if (low.includes("integral")) return "Lanche Integral";
                if (low.includes("ceia")) return "Ceia";
                if (low === "lanche") return "Lanche Ninho";
                return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
              };
              return `${formatName(name)}: ${String(qty).padStart(2, '0')}`;
            })
            .join("\n");
        }
      } else if (activeTab === "integral" || integralItems[inv.studentId]) {
        const items = integralItems[inv.studentId];
        if (items) {
          consumptionText = [...items]
            .sort((a, b) => {
              const getPriority = (n: string) => {
                const low = n.toLowerCase();
                if (low.includes("manhã")) return 1;
                if (low.includes("almoço")) return 2;
                if (low.includes("tarde")) return 3;
                if (low.includes("integral")) return 4;
                if (low.includes("ceia")) return 5;
                return 6;
              };
              return getPriority(a.name) - getPriority(b.name);
            })
            .map((it) => {
              const formatName = (n: string) => {
                const low = n.toLowerCase();
                if (low.includes("manhã")) return "Lanche da Manhã";
                if (low.includes("almoço")) return "Almoço";
                if (low.includes("tarde")) return "Lanche da Tarde";
                if (low.includes("integral")) return "Lanche Integral";
                if (low.includes("ceia")) return "Ceia";
                return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
              };
              return `${formatName(it.name)}: ${String(it.quantity).padStart(2, '0')}`;
            })
            .join("\n");
        }
      }
      msg = msg.replace(/{CONSUMPTION}/g, consumptionText);
    }

    return msg;
  }, [students, classes, services, messageTemplates, mandatorySnackBySegment, activeTab, integralItems, dbConsumption]);

  return {
    formatStudentCopyId,
    getStudentMessage
  };
};
