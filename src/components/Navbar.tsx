'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBudget } from '@/context/BudgetContext';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { Button, ConfirmDialog, Dialog } from './ui/design-system';

interface NavbarProps {
  activeTab: 'dashboard' | 'balance' | 'investments';
  setActiveTab: (tab: 'dashboard' | 'balance' | 'investments') => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { resetToDefaults, exportDataJson, importDataJson } = useBudget();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJson(content);
      setNotice(
        success
          ? { title: 'Datos importados', body: 'Se cargó el respaldo en este dispositivo.' }
          : { title: 'No se pudo importar', body: 'El archivo no es un respaldo válido.' }
      );
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tab = (id: NavbarProps['activeTab'], label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors appearance-none ${
        activeTab === id
          ? 'bg-surface-2 text-ink'
          : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <span className="font-semibold text-[15px] text-ink whitespace-nowrap">
            Mi Presupuesto
          </span>
          <nav className="flex items-center gap-0.5">
            {tab('dashboard', 'Resumen')}
            {tab('balance', 'Gastos')}
            {tab('investments', 'Activos')}
          </nav>
        </div>

        <div className="flex items-center gap-1 text-[13px] text-muted shrink-0">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={`px-2.5 py-1.5 rounded-lg hover:text-ink appearance-none ${
                menuOpen ? 'bg-surface-2 text-ink' : ''
              }`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              Datos
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-40 min-w-[11rem] rounded-xl border border-line bg-surface py-1 shadow-sm"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 hover:bg-surface-2 text-ink appearance-none"
                  onClick={() => {
                    exportDataJson();
                    setMenuOpen(false);
                  }}
                >
                  Exportar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 hover:bg-surface-2 text-ink appearance-none"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  Importar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 hover:bg-surface-2 text-danger appearance-none"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmReset(true);
                  }}
                >
                  Reiniciar
                </button>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={toggleTheme}
            className="ml-1 p-1.5 rounded-lg border border-line text-ink hover:bg-surface-2"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title="Reiniciar presupuesto"
          description="Se borrará todo y volverás a la configuración inicial."
          confirmLabel="Reiniciar"
          danger
          onConfirm={resetToDefaults}
          onClose={() => setConfirmReset(false)}
        />
      )}
      {notice && (
        <Dialog
          title={notice.title}
          onClose={() => setNotice(null)}
          footer={
            <Button type="button" variant="primary" onClick={() => setNotice(null)}>
              Listo
            </Button>
          }
        >
          <p className="text-[13px] text-muted mt-1">{notice.body}</p>
        </Dialog>
      )}
    </header>
  );
}
