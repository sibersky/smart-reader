import React, { createContext, useContext, useState, useEffect } from 'react';

export type Locale = 'ru' | 'en' | 'es';

export const translations = {
  ru: {
    nav: {
      home: "Главная",
      courses: "Курсы",
      about: "О нас",
      contact: "Контакты",
      profile: "Профиль",
      logout: "Выйти",
      login: "Войти",
      signUp: "Регистрация",
    },
    authGate: {
      title: "Доступно только зарегистрированным студентам",
      description: "Умный ридер анализирует сложность лексики под ваш уровень и позволяет сохранять незнакомые слова в интервальное повторение Poke-Me-On. Войдите в единый аккаунт Teacher Alex, чтобы продолжить.",
      loginButton: "Войти через Teacher Alex Account",
      signUpButton: "Создать аккаунт",
      checkingAuth: "Проверка авторизации...",
    },
    reader: {
      title: "Smart Reader — Умный ридер для чтения",
      badge: "Teacher Alex AI Suite",
      heading: "Интерактивный ридер с анализом уровня лексики",
      subtitle: "Вставьте отрывок текста или загрузите скриншот из книги, статьи или теста. Ридер выделит все слова выше вашего уровня CEFR и покажет определение и перевод по клику.",
      tabText: "Вставить текст",
      tabImage: "Загрузить скриншот / фото",
      textPlaceholder: "Вставьте любой англоязычный текст сюда (статью, отрывок из книги, задание к экзамену)...",
      dropImagePrompt: "Перетащите изображение сюда или нажмите для выбора",
      dropImageSub: "Поддерживаются PNG, JPG, WEBP скриншоты страниц или документов (до 10 МБ)",
      imageUploaded: "Изображение загружено:",
      changeImage: "Выбрать другое фото",
      levelLabel: "Ваш текущий уровень (CEFR):",
      levelHint: "Слова этого уровня и ниже считаются известными. Слова выше вашего уровня будут подсвечены.",
      l1Label: "Ваш родной язык для перевода (L1):",
      analyzeButton: "Анализировать и читать",
      analyzingButton: "ИИ анализирует лексику...",
      statsBar: {
        totalWords: "Всего слов",
        aboveLevel: "Выше уровня",
        comprehension: "Доступность текста",
        readingTime: "Время чтения",
        min: "мин",
      },
      legend: {
        borderline: "Пограничные (+1 уровень)",
        advanced: "Сложные (+2 уровня и выше)",
      },
      controls: {
        fontSans: "Без засечек",
        fontSerif: "С засечками",
        newText: "Новый текст",
        exportAll: "Экспорт всех слов",
      },
      popover: {
        definition: "Определение в контексте",
        revealTranslation: "Показать перевод",
        hideTranslation: "Скрыть перевод",
        addToPokeMeOn: "Добавить в Poke-Me-On",
        addedToDeck: "Добавлено в колоду!",
        copyFlashcard: "Скопировать (Слово — Перевод)",
        copied: "Скопировано в буфер!",
        close: "Закрыть",
      },
      emptyResults: "Не удалось выделить слова. Попробуйте другой отрывок.",
      errorTitle: "Ошибка анализа",
      tryAgain: "Попробовать снова",
    },
  },
  en: {
    nav: {
      home: "Home",
      courses: "Courses",
      about: "About",
      contact: "Contact",
      profile: "Profile",
      logout: "Logout",
      login: "Login",
      signUp: "Sign Up",
    },
    authGate: {
      title: "Exclusively for Registered Students",
      description: "Smart Reader analyzes vocabulary difficulty against your specific CEFR level and syncs unfamiliar words directly to Poke-Me-On spaced repetition. Log in with your Teacher Alex account to continue.",
      loginButton: "Log In with Teacher Alex Account",
      signUpButton: "Create an Account",
      checkingAuth: "Checking authentication...",
    },
    reader: {
      title: "Smart Reader — Interactive Graded Vocabulary Reader",
      badge: "Teacher Alex AI Suite",
      heading: "Interactive Graded Vocabulary Reader",
      subtitle: "Paste text or upload a screenshot from an article, book, or exam. Smart Reader highlights all words above your CEFR level with instant in-context definitions and L1 translations.",
      tabText: "Paste Text",
      tabImage: "Upload Screenshot / Photo",
      textPlaceholder: "Paste any English text here (an article, book passage, or exam prompt)...",
      dropImagePrompt: "Drag & drop an image here or click to browse",
      dropImageSub: "Supports PNG, JPG, and WEBP screenshots or photos (up to 10 MB)",
      imageUploaded: "Image uploaded:",
      changeImage: "Change Image",
      levelLabel: "Your Current CEFR Level:",
      levelHint: "Words at or below this level are treated as familiar. Words above this level will be highlighted.",
      l1Label: "Your Native Language (L1):",
      analyzeButton: "Analyze & Read",
      analyzingButton: "Analyzing vocabulary with AI...",
      statsBar: {
        totalWords: "Total Words",
        aboveLevel: "Above Level",
        comprehension: "Text Comprehension",
        readingTime: "Est. Read Time",
        min: "min",
      },
      legend: {
        borderline: "Borderline (+1 Level)",
        advanced: "Advanced (+2 Levels)",
      },
      controls: {
        fontSans: "Sans-Serif",
        fontSerif: "Serif",
        newText: "New Text",
        exportAll: "Export All Words",
      },
      popover: {
        definition: "In-Context Definition",
        revealTranslation: "Reveal Translation",
        hideTranslation: "Hide Translation",
        addToPokeMeOn: "Save to Poke-Me-On",
        addedToDeck: "Saved to Deck!",
        copyFlashcard: "Copy (Word — Translation)",
        copied: "Copied to clipboard!",
        close: "Close",
      },
      emptyResults: "Could not find any vocabulary words to annotate. Please try another text.",
      errorTitle: "Analysis Error",
      tryAgain: "Try Again",
    },
  },
  es: {
    nav: {
      home: "Inicio",
      courses: "Cursos",
      about: "Nosotros",
      contact: "Contacto",
      profile: "Perfil",
      logout: "Cerrar sesión",
      login: "Iniciar sesión",
      signUp: "Registrarse",
    },
    authGate: {
      title: "Exclusivo para estudiantes registrados",
      description: "El Lector Inteligente analiza la dificultad del vocabulario según tu nivel MCER y te permite guardar palabras en el sistema de repetición espaciada Poke-Me-On. Inicia sesión para continuar.",
      loginButton: "Iniciar sesión con Teacher Alex",
      signUpButton: "Crear una cuenta",
      checkingAuth: "Verificando autenticación...",
    },
    reader: {
      title: "Smart Reader — Lector Inteligente con Glosario",
      badge: "Teacher Alex AI Suite",
      heading: "Lector Inteligente con Glosario de Vocabulario",
      subtitle: "Pega un texto o sube una captura de pantalla de un libro, artículo o examen. El lector resaltará las palabras por encima de tu nivel MCER con definiciones y traducciones al hacer clic.",
      tabText: "Pegar texto",
      tabImage: "Subir captura / foto",
      textPlaceholder: "Pega aquí cualquier texto en inglés (artículo, fragmento de libro o examen)...",
      dropImagePrompt: "Arrastra una imagen aquí o haz clic para seleccionarla",
      dropImageSub: "Soporta PNG, JPG y WEBP (hasta 10 MB)",
      imageUploaded: "Imagen cargada:",
      changeImage: "Cambiar imagen",
      levelLabel: "Tu nivel actual (MCER):",
      levelHint: "Las palabras de este nivel o inferior se consideran conocidas. Las palabras superiores serán resaltadas.",
      l1Label: "Tu lengua materna para traducción (L1):",
      analyzeButton: "Analizar y leer",
      analyzingButton: "La IA está analizando el vocabulario...",
      statsBar: {
        totalWords: "Palabras totales",
        aboveLevel: "Nivel superior",
        comprehension: "Comprensión del texto",
        readingTime: "Tiempo de lectura",
        min: "min",
      },
      legend: {
        borderline: "Límite (+1 nivel)",
        advanced: "Avanzadas (+2 niveles o más)",
      },
      controls: {
        fontSans: "Sin serifa",
        fontSerif: "Con serifa",
        newText: "Nuevo texto",
        exportAll: "Exportar todas las palabras",
      },
      popover: {
        definition: "Definición en contexto",
        revealTranslation: "Mostrar traducción",
        hideTranslation: "Ocultar traducción",
        addToPokeMeOn: "Guardar en Poke-Me-On",
        addedToDeck: "¡Guardado en la baraja!",
        copyFlashcard: "Copiar (Palabra — Traducción)",
        copied: "¡Copiado al portapapeles!",
        close: "Cerrar",
      },
      emptyResults: "No se pudieron anotar palabras. Prueba con otro fragmento.",
      errorTitle: "Error de análisis",
      tryAgain: "Intentar de nuevo",
    },
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: typeof translations['ru'];
}

const I18nContext = createContext<I18nContextType>({
  locale: 'ru',
  setLocale: () => {},
  t: translations.ru,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('teacher_alex_locale') as Locale | null;
      if (saved && (saved === 'ru' || saved === 'en' || saved === 'es')) {
        setLocaleState(saved);
      } else {
        const browserLang = navigator.language.slice(0, 2);
        if (browserLang === 'es') setLocaleState('es');
        else if (browserLang === 'en') setLocaleState('en');
        else setLocaleState('ru');
      }
    } catch {
      setLocaleState('ru');
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('teacher_alex_locale', newLocale);
    } catch (e) {
      console.warn("Could not save locale", e);
    }
  };

  const t = translations[locale] || translations.en;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);
