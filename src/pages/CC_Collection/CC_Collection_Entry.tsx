import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Scale, FlaskConical, ArrowRightCircle } from "lucide-react";
import { ROUTES } from "@/constatnts/routesConstants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CCCollectionHub = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const options = [
    {
      title: t('weight_collection'),
      description: "Record milk quantity received from farmers at the chilling center.",
      icon: <Scale className="h-10 w-10" />,
      href: ROUTES.CC_COLLECTION.WEIGHT_COLLECTION,
      color: "blue",
      gradient: "from-blue-600 to-indigo-700",
      step: "Step 1"
    },
    {
      title: t('analyser_collection'),
      description: "Analyze FAT/SNF quality and calculate final payout for farmers.",
      icon: <FlaskConical className="h-10 w-10" />,
      href: ROUTES.CC_COLLECTION.ANALYSER_COLLECTION,
      color: "purple",
      gradient: "from-purple-600 to-indigo-700",
      step: "Step 2"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="px-4 py-1 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 text-[10px] font-bold tracking-widest uppercase">
            Collection Workflow
          </Badge>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            {t('cc_collection')}
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto font-medium">
            Manage your daily milk collection operations with a specialized two-step digital workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {options.map((option) => (
            <Card 
              key={option.title}
              className="group relative border-none shadow-2xl hover:shadow-blue-200/50 dark:hover:shadow-none transition-all duration-500 cursor-pointer overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900"
              onClick={() => navigate(option.href)}
            >
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
                option.gradient
              )} />
              
              <CardContent className="p-10 flex flex-col items-start text-left space-y-6">
                <div className="flex justify-between items-center w-full">
                  <div className={cn(
                    "p-5 rounded-3xl bg-gray-50 dark:bg-gray-800 group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-gray-700 transition-all duration-500 shadow-inner",
                    option.color === 'blue' ? "text-blue-600" : "text-purple-600"
                  )}>
                    {option.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-gray-400 transition-colors">
                    {option.step}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <CardTitle className="text-2xl font-black text-gray-900 dark:text-white group-hover:translate-x-1 transition-transform">
                    {option.title}
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    {option.description}
                  </p>
                </div>

                <div className={cn(
                  "flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all pt-4 border-t border-gray-50 dark:border-gray-800 w-full",
                  option.color === 'blue' ? "text-blue-600" : "text-purple-600"
                )}>
                  Open Module <ArrowRightCircle className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-8 text-center">
          <p className="text-[11px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">
            © 2024 Dairy Management System • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default CCCollectionHub;
