import { useEffect, useState } from 'react';
export type Locale = 'en' | 'pt-BR' | 'es' | 'fr';
const KEY = 'forge-npwd-appexemple:language';
const EVENT = 'forge-npwd-appexemple:language-changed';
const controls = {
  en: { language: 'Language', notify: 'Test notification', notificationText: 'The external app notification is working.', notificationSent: 'Notification sent', notificationPreview: 'Notification simulated in the browser' },
  'pt-BR': { language: 'Idioma', notify: 'Testar notificação', notificationText: 'A notificação do aplicativo externo está funcionando.', notificationSent: 'Notificação enviada', notificationPreview: 'Notificação simulada no navegador' },
  es: { language: 'Idioma', notify: 'Probar notificación', notificationText: 'La notificación de la app externa funciona.', notificationSent: 'Notificación enviada', notificationPreview: 'Notificación simulada en el navegador' },
  fr: { language: 'Langue', notify: 'Tester la notification', notificationText: 'La notification de l’app externe fonctionne.', notificationSent: 'Notification envoyée', notificationPreview: 'Notification simulée dans le navigateur' },
};
export const locales: Locale[] = ['en', 'pt-BR', 'es', 'fr'];
const copy = {
  en: { title: 'Forge Example', subtitle: 'An external app. Two home widgets.', overview: 'Overview', guide: 'Guide', online: 'Players online', updated: 'Updated', refresh: 'Refresh', loading: 'Loading…', retry: 'Try again', unavailable: 'Service unavailable', browser: 'Browser preview · illustrative data', live: 'Game · server data', widgets: 'Home widgets', summary: 'Server summary', clock: 'Local clock', instructions: 'Install this app in Forge Store. Hold an empty area of the home screen, open Widgets, choose a size and drag it to a free space.', developer: 'Copy this resource, change its identifiers, build it and register its folder name in the phone config.json apps array.', compact: 'Compact', wide: 'Wide', full: 'Full', home: 'Home' },
  'pt-BR': { title: 'Forge Exemplo', subtitle: 'Um app externo. Dois widgets na tela inicial.', overview: 'Visão geral', guide: 'Guia', online: 'Jogadores online', updated: 'Atualizado', refresh: 'Atualizar', loading: 'Carregando…', retry: 'Tentar novamente', unavailable: 'Serviço indisponível', browser: 'Prévia no navegador · dados ilustrativos', live: 'Jogo · dados do servidor', widgets: 'Widgets na tela inicial', summary: 'Resumo do servidor', clock: 'Relógio local', instructions: 'Instale este app na Forge Store. Segure uma área vazia da tela inicial, abra Widgets, escolha um tamanho e arraste para um espaço livre.', developer: 'Copie este resource, altere os identificadores, compile e registre o nome da pasta no array apps do config.json do telefone.', compact: 'Compacto', wide: 'Largo', full: 'Completo', home: 'Início' },
  es: { title: 'Forge Ejemplo', subtitle: 'Una app externa. Dos widgets de inicio.', overview: 'Resumen', guide: 'Guía', online: 'Jugadores conectados', updated: 'Actualizado', refresh: 'Actualizar', loading: 'Cargando…', retry: 'Reintentar', unavailable: 'Servicio no disponible', browser: 'Vista del navegador · datos ilustrativos', live: 'Juego · datos del servidor', widgets: 'Widgets de inicio', summary: 'Resumen del servidor', clock: 'Reloj local', instructions: 'Instala esta app en Forge Store. Mantén pulsada una zona vacía del inicio, abre Widgets, elige un tamaño y arrástralo a un espacio libre.', developer: 'Copia este recurso, cambia sus identificadores, compílalo y registra el nombre de la carpeta en el array apps del config.json del teléfono.', compact: 'Compacto', wide: 'Ancho', full: 'Completo', home: 'Inicio' },
  fr: { title: 'Forge Exemple', subtitle: 'Une app externe. Deux widgets d’accueil.', overview: 'Vue d’ensemble', guide: 'Guide', online: 'Joueurs en ligne', updated: 'Mis à jour', refresh: 'Actualiser', loading: 'Chargement…', retry: 'Réessayer', unavailable: 'Service indisponible', browser: 'Aperçu navigateur · données illustratives', live: 'Jeu · données du serveur', widgets: 'Widgets d’accueil', summary: 'Résumé du serveur', clock: 'Horloge locale', instructions: 'Installez cette app dans Forge Store. Maintenez une zone vide de l’accueil, ouvrez Widgets, choisissez une taille et déplacez-le vers un espace libre.', developer: 'Copiez cette ressource, changez ses identifiants, compilez et enregistrez le nom du dossier dans le tableau apps du config.json du téléphone.', compact: 'Compact', wide: 'Large', full: 'Complet', home: 'Accueil' },
};
function initialLocale(): Locale {
  try { const saved = localStorage.getItem(KEY); if (locales.includes(saved as Locale)) return saved as Locale; } catch { /* Storage can be disabled. */ }
  const language = navigator.language.toLowerCase();
  return language.startsWith('pt') ? 'pt-BR' : language.startsWith('es') ? 'es' : language.startsWith('fr') ? 'fr' : 'en';
}
export function useLocale() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    const update = () => setLocale(initialLocale());
    window.addEventListener(EVENT, update); window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  return { locale, text: { ...copy[locale], ...controls[locale] }, setLocale: (next: Locale) => {
    try { localStorage.setItem(KEY, next); } catch { /* UI still works without storage. */ }
    setLocale(next); window.dispatchEvent(new Event(EVENT));
  } };
}
