import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Ошибка: Пользователь попытался получить доступ к несуществующему маршруту:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">0_0</h1>
        <p className="text-xl text-gray-600 mb-6">Упс! Страница не найдена</p>
        <a 
          href="/" 
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Вернуться на главную
        </a>
      </div>
    </div>
  );
};

export default NotFound;