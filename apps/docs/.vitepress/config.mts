import { defineConfig } from 'vitepress'

const baseUrl = '' // Using custom domain, no base path needed

// Function to generate navigation for any language
function generateNavigation(langCode) {
  const baseNav = [
    { textKey: 'Home', link: '/' },
    { textKey: 'Getting Started', link: '/getting-started' },
    { textKey: 'Philosophy', link: '/philosophy' },
    { textKey: 'Roadmap', link: '/roadmap' },
    { textKey: 'Contributing', link: '/contributing' },
  ]

  const baseSidebar = [
    {
      textKey: 'Introduction',
      items: [
        { textKey: 'What is Hatcher?', link: '/introduction' },
        { textKey: 'Getting Started', link: '/getting-started' },
      ],
    },
    {
      textKey: 'Core Concepts',
      items: [
        { textKey: 'Visual-to-Code Bridge', link: '/visual-to-code' },
        { textKey: 'AI Engine Integration', link: '/ai-engines' },
        { textKey: 'Playbooks System', link: '/playbooks' },
      ],
    },
    {
      textKey: 'Development',
      items: [
        { textKey: 'Architecture', link: '/architecture' },
        { textKey: 'Contributing Guide', link: '/contributing' },
        { textKey: 'Coding Standards', link: '/coding-standards' },
      ],
    },
    {
      textKey: 'Community',
      items: [{ textKey: 'Roadmap', link: '/roadmap' }],
    },
  ]

  // Text translations for navigation
  const translations = {
    en: {
      Home: 'Home',
      'Getting Started': 'Getting Started',
      Philosophy: 'Philosophy',
      Roadmap: 'Roadmap',
      Contributing: 'Contributing',
      Introduction: 'Introduction',
      'What is Hatcher?': 'What is Hatcher?',
      'Core Concepts': 'Core Concepts',
      'Visual-to-Code Bridge': 'Visual-to-Code Bridge',
      'AI Engine Integration': 'AI Engine Integration',
      'Playbooks System': 'Playbooks System',
      Development: 'Development',
      Architecture: 'Architecture',
      'Contributing Guide': 'Contributing Guide',
      'Coding Standards': 'Coding Standards',
      Community: 'Community',
    },
    es: {
      Home: 'Inicio',
      'Getting Started': 'Comenzar',
      Philosophy: 'Filosofía',
      Roadmap: 'Plan de Ruta',
      Contributing: 'Contribuir',
      Introduction: 'Introducción',
      'What is Hatcher?': '¿Qué es Hatcher?',
      'Core Concepts': 'Conceptos Principales',
      'Visual-to-Code Bridge': 'Puente Visual-a-Código',
      'AI Engine Integration': 'Integración con Motores de IA',
      'Playbooks System': 'Sistema de Playbooks',
      Development: 'Desarrollo',
      Architecture: 'Arquitectura',
      'Contributing Guide': 'Guía de Contribución',
      'Coding Standards': 'Estándares de Código',
      Community: 'Comunidad',
    },
    fr: {
      Home: 'Accueil',
      'Getting Started': 'Commencer',
      Philosophy: 'Philosophie',
      Roadmap: 'Feuille de Route',
      Contributing: 'Contribuer',
      Introduction: 'Introduction',
      'What is Hatcher?': "Qu'est-ce que Hatcher ?",
      'Core Concepts': 'Concepts Centraux',
      'Visual-to-Code Bridge': 'Pont Visuel-vers-Code',
      'AI Engine Integration': 'Intégration Moteur IA',
      'Playbooks System': 'Système Playbooks',
      Development: 'Développement',
      Architecture: 'Architecture',
      'Contributing Guide': 'Guide de Contribution',
      'Coding Standards': 'Standards de Code',
      Community: 'Communauté',
    },
    de: {
      Home: 'Startseite',
      'Getting Started': 'Erste Schritte',
      Philosophy: 'Philosophie',
      Roadmap: 'Roadmap',
      Contributing: 'Beitragen',
      Introduction: 'Einführung',
      'What is Hatcher?': 'Was ist Hatcher?',
      'Core Concepts': 'Kernkonzepte',
      'Visual-to-Code Bridge': 'Visuell-zu-Code-Brücke',
      'AI Engine Integration': 'KI-Engine Integration',
      'Playbooks System': 'Playbooks System',
      Development: 'Entwicklung',
      Architecture: 'Architektur',
      'Contributing Guide': 'Beitragsanleitung',
      'Coding Standards': 'Coding Standards',
      Community: 'Community',
    },
    pt: {
      Home: 'Início',
      'Getting Started': 'Começar',
      Philosophy: 'Filosofia',
      Roadmap: 'Roteiro',
      Contributing: 'Contribuir',
      Introduction: 'Introdução',
      'What is Hatcher?': 'O que é Hatcher?',
      'Core Concepts': 'Conceitos Centrais',
      'Visual-to-Code Bridge': 'Ponte Visual-para-Código',
      'AI Engine Integration': 'Integração Motor IA',
      'Playbooks System': 'Sistema Playbooks',
      Development: 'Desenvolvimento',
      Architecture: 'Arquitetura',
      'Contributing Guide': 'Guia de Contribuição',
      'Coding Standards': 'Padrões de Código',
      Community: 'Comunidade',
    },
    'zh-cn': {
      Home: '首页',
      'Getting Started': '开始使用',
      Philosophy: '哲学',
      Roadmap: '路线图',
      Contributing: '贡献',
      Introduction: '介绍',
      'What is Hatcher?': '什么是 Hatcher？',
      'Core Concepts': '核心概念',
      'Visual-to-Code Bridge': '可视化到代码桥梁',
      'AI Engine Integration': 'AI 引擎集成',
      'Playbooks System': 'Playbooks 系统',
      Development: '开发',
      Architecture: '架构',
      'Contributing Guide': '贡献指南',
      'Coding Standards': '编码标准',
      Community: '社区',
    },
    ar: {
      Home: 'الرئيسية',
      'Getting Started': 'البدء',
      Philosophy: 'الفلسفة',
      Roadmap: 'خارطة الطريق',
      Contributing: 'المساهمة',
      Introduction: 'مقدمة',
      'What is Hatcher?': 'ما هو Hatcher؟',
      'Core Concepts': 'المفاهيم الأساسية',
      'Visual-to-Code Bridge': 'جسر البصري إلى الكود',
      'AI Engine Integration': 'تكامل محرك الذكاء الاصطناعي',
      'Playbooks System': 'نظام Playbooks',
      Development: 'التطوير',
      Architecture: 'الهيكل المعماري',
      'Contributing Guide': 'دليل المساهمة',
      'Coding Standards': 'معايير البرمجة',
      Community: 'المجتمع',
    },
    hi: {
      Home: 'होम',
      'Getting Started': 'शुरुआत',
      Philosophy: 'दर्शन',
      Roadmap: 'रोडमैप',
      Contributing: 'योगदान',
      Introduction: 'परिचय',
      'What is Hatcher?': 'Hatcher क्या है?',
      'Core Concepts': 'मुख्य अवधारणाएं',
      'Visual-to-Code Bridge': 'विज़ुअल-टू-कोड ब्रिज',
      'AI Engine Integration': 'AI इंजन एकीकरण',
      'Playbooks System': 'Playbooks सिस्टम',
      Development: 'विकास',
      Architecture: 'आर्किटेक्चर',
      'Contributing Guide': 'योगदान गाइड',
      'Coding Standards': 'कोडिंग मानक',
      Community: 'समुदाय',
    },
    id: {
      Home: 'Beranda',
      'Getting Started': 'Memulai',
      Philosophy: 'Filosofi',
      Roadmap: 'Roadmap',
      Contributing: 'Berkontribusi',
      Introduction: 'Pengenalan',
      'What is Hatcher?': 'Apa itu Hatcher?',
      'Core Concepts': 'Konsep Inti',
      'Visual-to-Code Bridge': 'Jembatan Visual-ke-Kode',
      'AI Engine Integration': 'Integrasi Mesin AI',
      'Playbooks System': 'Sistem Playbooks',
      Development: 'Pengembangan',
      Architecture: 'Arsitektur',
      'Contributing Guide': 'Panduan Kontribusi',
      'Coding Standards': 'Standar Coding',
      Community: 'Komunitas',
    },
    ja: {
      Home: 'ホーム',
      'Getting Started': '始める',
      Philosophy: '哲学',
      Roadmap: 'ロードマップ',
      Contributing: '貢献',
      Introduction: '紹介',
      'What is Hatcher?': 'Hatcher とは？',
      'Core Concepts': 'コア概念',
      'Visual-to-Code Bridge': 'ビジュアル-to-コードブリッジ',
      'AI Engine Integration': 'AI エンジン統合',
      'Playbooks System': 'Playbooks システム',
      Development: '開発',
      Architecture: 'アーキテクチャ',
      'Contributing Guide': '貢献ガイド',
      'Coding Standards': 'コーディング標準',
      Community: 'コミュニティ',
    },
    ko: {
      Home: '홈',
      'Getting Started': '시작하기',
      Philosophy: '철학',
      Roadmap: '로드맵',
      Contributing: '기여하기',
      Introduction: '소개',
      'What is Hatcher?': 'Hatcher란?',
      'Core Concepts': '핵심 개념',
      'Visual-to-Code Bridge': '비주얼-투-코드 브리지',
      'AI Engine Integration': 'AI 엔진 통합',
      'Playbooks System': 'Playbooks 시스템',
      Development: '개발',
      Architecture: '아키텍처',
      'Contributing Guide': '기여 가이드',
      'Coding Standards': '코딩 표준',
      Community: '커뮤니티',
    },
    fa: {
      Home: 'خانه',
      'Getting Started': 'شروع کار',
      Philosophy: 'فلسفه',
      Roadmap: 'نقشه راه',
      Contributing: 'مشارکت',
      Introduction: 'معرفی',
      'What is Hatcher?': 'Hatcher چیست؟',
      'Core Concepts': 'مفاهیم اصلی',
      'Visual-to-Code Bridge': 'پل بصری-به-کد',
      'AI Engine Integration': 'یکپارچگی موتور هوش مصنوعی',
      'Playbooks System': 'سیستم Playbooks',
      Development: 'توسعه',
      Architecture: 'معماری',
      'Contributing Guide': 'راهنمای مشارکت',
      'Coding Standards': 'استانداردهای برنامه نویسی',
      Community: 'جامعه',
    },
    ru: {
      Home: 'Главная',
      'Getting Started': 'Начало работы',
      Philosophy: 'Философия',
      Roadmap: 'Дорожная карта',
      Contributing: 'Участие',
      Introduction: 'Введение',
      'What is Hatcher?': 'Что такое Hatcher?',
      'Core Concepts': 'Основные концепции',
      'Visual-to-Code Bridge': 'Мост Визуал-в-Код',
      'AI Engine Integration': 'Интеграция ИИ Движка',
      'Playbooks System': 'Система Playbooks',
      Development: 'Разработка',
      Architecture: 'Архитектура',
      'Contributing Guide': 'Руководство по участию',
      'Coding Standards': 'Стандарты кодирования',
      Community: 'Сообщество',
    },
    tr: {
      Home: 'Ana Sayfa',
      'Getting Started': 'Başlangıç',
      Philosophy: 'Felsefe',
      Roadmap: 'Yol Haritası',
      Contributing: 'Katkıda Bulun',
      Introduction: 'Giriş',
      'What is Hatcher?': 'Hatcher Nedir?',
      'Core Concepts': 'Temel Kavramlar',
      'Visual-to-Code Bridge': 'Görsel-Kod Köprüsü',
      'AI Engine Integration': 'AI Motor Entegrasyonu',
      'Playbooks System': 'Playbooks Sistemi',
      Development: 'Geliştirme',
      Architecture: 'Mimari',
      'Contributing Guide': 'Katkı Rehberi',
      'Coding Standards': 'Kodlama Standartları',
      Community: 'Topluluk',
    },
  }

  const langTranslations = translations[langCode] || translations['en']
  const langPrefix = langCode === 'en' ? '' : `/${langCode}`

  // UI text translations for VitePress interface
  const uiTexts = {
    en: {},
    es: {
      outline: {
        label: 'En esta página',
      },
      docFooter: {
        prev: 'Página anterior',
        next: 'Página siguiente',
      },
      darkModeSwitchLabel: 'Modo oscuro',
      sidebarMenuLabel: 'Menú',
      returnToTopLabel: 'Volver arriba',
      langMenuLabel: 'Cambiar idioma',
      editLink: {
        text: 'Editar esta página en GitHub',
      },
    },
    fr: {
      outline: {
        label: 'Sur cette page',
      },
      docFooter: {
        prev: 'Page précédente',
        next: 'Page suivante',
      },
      darkModeSwitchLabel: 'Mode sombre',
      sidebarMenuLabel: 'Menu',
      returnToTopLabel: 'Retour en haut',
      langMenuLabel: 'Changer de langue',
      editLink: {
        text: 'Modifier cette page sur GitHub',
      },
    },
    de: {
      outline: {
        label: 'Auf dieser Seite',
      },
      docFooter: {
        prev: 'Vorherige Seite',
        next: 'Nächste Seite',
      },
      darkModeSwitchLabel: 'Dunkler Modus',
      sidebarMenuLabel: 'Menü',
      returnToTopLabel: 'Nach oben',
      langMenuLabel: 'Sprache ändern',
      editLink: {
        text: 'Diese Seite auf GitHub bearbeiten',
      },
    },
    pt: {
      outline: {
        label: 'Nesta página',
      },
      docFooter: {
        prev: 'Página anterior',
        next: 'Próxima página',
      },
      darkModeSwitchLabel: 'Modo escuro',
      sidebarMenuLabel: 'Menu',
      returnToTopLabel: 'Voltar ao topo',
      langMenuLabel: 'Mudar idioma',
      editLink: {
        text: 'Editar esta página no GitHub',
      },
    },
    'zh-cn': {
      outline: {
        label: '本页内容',
      },
      docFooter: {
        prev: '上一页',
        next: '下一页',
      },
      darkModeSwitchLabel: '深色模式',
      sidebarMenuLabel: '菜单',
      returnToTopLabel: '返回顶部',
      langMenuLabel: '更改语言',
      editLink: {
        text: '在 GitHub 上编辑此页',
      },
    },
    ar: {
      outline: {
        label: 'في هذه الصفحة',
      },
      docFooter: {
        prev: 'الصفحة السابقة',
        next: 'الصفحة التالية',
      },
      darkModeSwitchLabel: 'الوضع المظلم',
      sidebarMenuLabel: 'القائمة',
      returnToTopLabel: 'العودة للأعلى',
      langMenuLabel: 'تغيير اللغة',
      editLink: {
        text: 'تحرير هذه الصفحة في GitHub',
      },
    },
    hi: {
      outline: {
        label: 'इस पृष्ठ पर',
      },
      docFooter: {
        prev: 'पिछला पृष्ठ',
        next: 'अगला पृष्ठ',
      },
      darkModeSwitchLabel: 'डार्क मोड',
      sidebarMenuLabel: 'मेनू',
      returnToTopLabel: 'शीर्ष पर वापस जाएं',
      langMenuLabel: 'भाषा बदलें',
      editLink: {
        text: 'GitHub पर इस पृष्ठ को संपादित करें',
      },
    },
    id: {
      outline: {
        label: 'Di halaman ini',
      },
      docFooter: {
        prev: 'Halaman sebelumnya',
        next: 'Halaman berikutnya',
      },
      darkModeSwitchLabel: 'Mode gelap',
      sidebarMenuLabel: 'Menu',
      returnToTopLabel: 'Kembali ke atas',
      langMenuLabel: 'Ubah bahasa',
      editLink: {
        text: 'Edit halaman ini di GitHub',
      },
    },
    ja: {
      outline: {
        label: 'このページの内容',
      },
      docFooter: {
        prev: '前のページ',
        next: '次のページ',
      },
      darkModeSwitchLabel: 'ダークモード',
      sidebarMenuLabel: 'メニュー',
      returnToTopLabel: 'トップに戻る',
      langMenuLabel: '言語を変更',
      editLink: {
        text: 'GitHub でこのページを編集',
      },
    },
    ko: {
      outline: {
        label: '이 페이지에서',
      },
      docFooter: {
        prev: '이전 페이지',
        next: '다음 페이지',
      },
      darkModeSwitchLabel: '다크 모드',
      sidebarMenuLabel: '메뉴',
      returnToTopLabel: '맨 위로',
      langMenuLabel: '언어 변경',
      editLink: {
        text: 'GitHub에서 이 페이지 편집',
      },
    },
    fa: {
      outline: {
        label: 'در این صفحه',
      },
      docFooter: {
        prev: 'صفحه قبلی',
        next: 'صفحه بعدی',
      },
      darkModeSwitchLabel: 'حالت تاریک',
      sidebarMenuLabel: 'منو',
      returnToTopLabel: 'بازگشت به بالا',
      langMenuLabel: 'تغییر زبان',
      editLink: {
        text: 'ویرایش این صفحه در GitHub',
      },
    },
    ru: {
      outline: {
        label: 'На этой странице',
      },
      docFooter: {
        prev: 'Предыдущая страница',
        next: 'Следующая страница',
      },
      darkModeSwitchLabel: 'Темный режим',
      sidebarMenuLabel: 'Меню',
      returnToTopLabel: 'Вернуться к началу',
      langMenuLabel: 'Изменить язык',
      editLink: {
        text: 'Редактировать эту страницу на GitHub',
      },
    },
    tr: {
      outline: {
        label: 'Bu sayfada',
      },
      docFooter: {
        prev: 'Önceki sayfa',
        next: 'Sonraki sayfa',
      },
      darkModeSwitchLabel: 'Karanlık mod',
      sidebarMenuLabel: 'Menü',
      returnToTopLabel: 'Başa git',
      langMenuLabel: 'Dil değiştir',
      editLink: {
        text: "Bu sayfayı GitHub'da düzenle",
      },
    },
  }

  // Generate nav with proper links and translations
  const nav = baseNav.map((item) => ({
    text: langTranslations[item.textKey] || item.textKey,
    link: langPrefix + item.link,
  }))

  // Generate sidebar with proper links and translations
  const sidebar = baseSidebar.map((section) => ({
    text: langTranslations[section.textKey] || section.textKey,
    items: section.items.map((item) => ({
      text: langTranslations[item.textKey] || item.textKey,
      link: langPrefix + item.link,
    })),
  }))

  const config = { nav, sidebar }

  // Add UI text translations if available
  if (uiTexts[langCode]) {
    Object.assign(config, uiTexts[langCode])
  }

  return config
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: baseUrl,
  title: 'Hatcher | The IDE for Controlled AI Development',
  description:
    'An open-source IDE that gives professional developers deterministic control over AI. Stop the guesswork. Start shipping.',

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      description:
        'An open-source IDE that gives professional developers deterministic control over AI. Stop the guesswork. Start shipping.',
      themeConfig: generateNavigation('en'),
    },
    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('ar'),
    },
    'zh-cn': {
      label: '简体中文',
      lang: 'zh-cn',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('zh-cn'),
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('fr'),
    },
    de: {
      label: 'Deutsch',
      lang: 'de',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('de'),
    },
    hi: {
      label: 'हिन्दी',
      lang: 'hi',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('hi'),
    },
    id: {
      label: 'Bahasa Indonesia',
      lang: 'id',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('id'),
    },
    ja: {
      label: '日本語',
      lang: 'ja',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('ja'),
    },
    ko: {
      label: '한국어',
      lang: 'ko',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('ko'),
    },
    fa: {
      label: 'فارسی',
      lang: 'fa',
      dir: 'rtl',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('fa'),
    },
    pt: {
      label: 'Português',
      lang: 'pt',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('pt'),
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('ru'),
    },
    es: {
      label: 'Español',
      lang: 'es',
      description:
        'El IDE para creadores que entregan. Entorno de desarrollo de código abierto diseñado para amplificación controlada con motores de IA.',
      themeConfig: generateNavigation('es'),
    },
    tr: {
      label: 'Türkçe',
      lang: 'tr',
      description:
        'The IDE for builders who ship. Open-source development environment designed for controlled amplification with AI engines.',
      themeConfig: generateNavigation('tr'),
    },
  },
  head: [
    // Favicon and basic meta
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],

    // Canonical URL - tells Google which is your preferred URL
    ['link', { rel: 'canonical', href: 'https://hatche.rs' }],

    // Open Graph meta tags for Facebook, LinkedIn, etc.
    [
      'meta',
      {
        property: 'og:title',
        content: 'Hatcher | The IDE for Controlled AI Development',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'An open-source IDE that gives professional developers deterministic control over AI. Stop the guesswork. Start shipping.',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://hatche.rs/brand/egg-white.png',
      },
    ],
    ['meta', { property: 'og:url', content: 'https://hatche.rs' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Hatcher' }],

    // Twitter Card meta tags
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    [
      'meta',
      {
        name: 'twitter:title',
        content: 'Hatcher | The IDE for Controlled AI Development',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          'An open-source IDE that gives professional developers deterministic control over AI. Stop the guesswork. Start shipping.',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:image',
        content: 'https://hatche.rs/brand/egg-white.png',
      },
    ],
    ['meta', { name: 'twitter:creator', content: '@HatcherDX' }],
    ['meta', { name: 'twitter:site', content: '@HatcherDX' }],

    // Additional SEO meta tags
    [
      'meta',
      {
        name: 'keywords',
        content:
          'AI IDE, visual-to-code, Vue AI tool, Claude Code IDE, deterministic AI control, open-source IDE, AI development, developer tools',
      },
    ],
    [
      'meta',
      { name: 'author', content: 'Chriss Mejía and the Hatcher community' },
    ],
    ['meta', { name: 'robots', content: 'index, follow' }],

    // Google Analytics
    [
      'script',
      {
        async: '',
        src: 'https://www.googletagmanager.com/gtag/js?id=G-LMJ8EF40PZ',
      },
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-LMJ8EF40PZ');`,
    ],
  ],

  themeConfig: {
    logo: {
      light: '/logo-small-inline-light.svg',
      dark: '/logo-small-inline-dark.svg',
    },
    siteTitle: false, // Hide text since we're using inline logo

    socialLinks: [
      { icon: 'github', link: 'https://github.com/HatcherDX/dx-engine' },
      { icon: 'twitter', link: 'https://twitter.com/HatcherDX' },
      { icon: 'discord', link: 'https://discord.gg/hatcher' },
    ],

    footer: {
      message:
        'Released under the MIT License. Built with ❤️ by Chriss Mejía and the Hatcher community.',
      copyright: 'Copyright © 2025-present HatcherDX',
    },

    editLink: {
      pattern:
        'https://github.com/HatcherDX/dx-engine/edit/main/apps/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },

  ignoreDeadLinks: [
    /^\/CODE_OF_CONDUCT/,
    /^\.\/CODE_OF_CONDUCT/,
    /^\.\.\/CODE_OF_CONDUCT/,
    /\.github\//,
    /bug_report/,
    /feature_request/,
  ],

  sitemap: {
    hostname: 'https://hatche.rs',
  },

  cleanUrls: true,

  // Fix language switching to preserve current page
  rewrites: {
    'en/:page(.*)': ':page',
  },

  // Improve language switching behavior
  transformPageData(pageData) {
    const canonicalUrl = `https://hatche.rs/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '')

    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push([
      'link',
      { rel: 'canonical', href: canonicalUrl },
    ])

    return pageData
  },
})
