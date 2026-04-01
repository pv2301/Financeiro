import React, { useState } from 'react';
import { storage } from '../services/storage';
import { INITIAL_ITEMS, INITIAL_RECIPES } from '../services/initialData';
import { Item, Recipe, GroupConfig, Category, Restriction, Substitution } from '../types';
import { CheckCircle2, AlertCircle, Database, ArrowRight } from 'lucide-react';

export default function Setup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const populateData = async () => {
    setStatus('loading');
    try {
      // 1. Categories
      const categories: Category[] = [
        'Fruta',
        'Lanche',
        'Suco',
        'Bebida',
        'Opção Semana',
        'Entrada',
        'Prato Principal',
        'Acompanhamento',
        'Ceia'
      ];
      await storage.saveCategories(categories);

      // 2. Restrictions
      const restrictions: Restriction[] = [
        { id: 'restr-1', nome: 'Sem Ovo' },
        { id: 'restr-2', nome: 'Sem Lactose' },
        { id: 'restr-3', nome: 'Sem Glúten' },
        { id: 'restr-4', nome: 'Alergia à Proteína do Leite de Vaca (APLV)' },
        { id: 'restr-5', nome: 'Diabetes' },
      ];
      await storage.saveRestrictions(restrictions);

      // 3. Recipes
      const recipes: Recipe[] = INITIAL_RECIPES.map((r, index) => ({
        ...r,
        id: `recipe-${index + 1}`,
        porcoes: r.porcoes || 30,
      } as Recipe));
      await storage.saveRecipes(recipes);

      // 4. Items
      const items: Item[] = INITIAL_ITEMS.map((item, index) => {
        const id = `item-${index + 1}`;
        // Try to link recipe
        const linkedRecipe = recipes.find(r => r.nome.toLowerCase() === item.nome?.toLowerCase());
        
        return {
          ...item,
          id,
          nome: item.nome || 'Sem Nome',
          categoria: item.categoria || 'Outros',
          contemOvo: item.contemOvo || false,
          contemLactose: item.contemLactose || false,
          contemGluten: item.contemGluten || false,
          receitaVinculadaId: linkedRecipe?.id,
        } as Item;
      });
      await storage.saveItems(items);

      // 5. Groups
      const groups: GroupConfig[] = [
        {
          id: 'group-bercario-1',
          nomeCurto: 'B1',
          nomeCompleto: 'Berçário I (4-12 meses)',
          cor: '#FF6B00',
          colunas: [
            { categoria: 'Fruta' },
            { categoria: 'Prato Principal' },
            { categoria: 'Ceia' },
          ]
        },
        {
          id: 'group-bercario-2',
          nomeCurto: 'B2',
          nomeCompleto: 'Berçário II (1-2 anos)',
          cor: '#0047BB',
          colunas: [
            { categoria: 'Fruta' },
            { categoria: 'Lanche' },
            { categoria: 'Entrada' },
            { categoria: 'Prato Principal' },
            { categoria: 'Acompanhamento' },
            { categoria: 'Ceia' },
          ]
        },
        {
          id: 'group-maternal',
          nomeCurto: 'MAT',
          nomeCompleto: 'Maternal / Jardim (2-5 anos)',
          cor: '#84CC16',
          colunas: [
            { categoria: 'Lanche' },
            { categoria: 'Suco' },
            { categoria: 'Entrada' },
            { categoria: 'Prato Principal' },
            { categoria: 'Acompanhamento' },
            { categoria: 'Ceia' },
          ]
        }
      ];
      await storage.saveConfig(groups);

      // 6. Substitutions
      const substitutions: Substitution[] = [
        {
          id: 'sub-1',
          itemOriginalId: items.find(it => it.nome === 'Pão Francês com queijo')?.id || '',
          restricao: 'Sem Glúten',
          itemSubstitutoId: items.find(it => it.nome === 'Tapioca de queijo')?.id || '',
          grupoDestino: 'Todos',
          observacao: 'Trocar pão por tapioca para celíacos.'
        },
        {
          id: 'sub-2',
          itemOriginalId: items.find(it => it.nome === 'Bolo de iogurte natural')?.id || '',
          restricao: 'Sem Lactose',
          itemSubstitutoId: items.find(it => it.nome === 'Bolo simples sem ovo')?.id || '',
          grupoDestino: 'Todos',
          observacao: 'Evitar iogurte para intolerantes à lactose.'
        }
      ].filter(s => s.itemOriginalId && s.itemSubstitutoId);
      await storage.saveSubstitutions(substitutions);

      setStatus('success');
      setMessage('Dados populados com sucesso! Você já pode navegar pelo sistema.');
    } catch (error) {
      console.error('Setup error:', error);
      setStatus('error');
      setMessage('Ocorreu um erro ao popular os dados. Verifique o console.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center space-y-8 border border-slate-100">
        <div className="w-20 h-20 bg-brand-blue/10 rounded-[2rem] flex items-center justify-center mx-auto text-brand-blue">
          <Database size={40} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-brand-blue uppercase tracking-tight">Configuração Inicial</h1>
          <p className="text-slate-500 font-medium">Clique no botão abaixo para carregar os dados iniciais do sistema (itens, receitas e grupos).</p>
        </div>

        {status === 'success' ? (
          <div className="p-6 bg-brand-lime/10 border border-brand-lime/20 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-center gap-2 text-brand-lime font-black uppercase tracking-widest text-sm">
              <CheckCircle2 size={20} />
              Sucesso!
            </div>
            <p className="text-slate-600 text-sm font-medium">{message}</p>
            <a 
              href="/" 
              className="inline-flex items-center gap-2 bg-brand-blue text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20"
            >
              Ir para o Dashboard
              <ArrowRight size={16} />
            </a>
          </div>
        ) : status === 'error' ? (
          <div className="p-6 bg-brand-orange/10 border border-brand-orange/20 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-center gap-2 text-brand-orange font-black uppercase tracking-widest text-sm">
              <AlertCircle size={20} />
              Erro
            </div>
            <p className="text-slate-600 text-sm font-medium">{message}</p>
            <button 
              onClick={populateData}
              className="bg-brand-orange text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/20"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <button 
            onClick={populateData}
            disabled={status === 'loading'}
            className="w-full bg-brand-blue text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-brand-blue/90 transition-all shadow-xl shadow-brand-blue/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {status === 'loading' ? (
              <>
                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Database size={20} />
                Popular Banco de Dados
              </>
            )}
          </button>
        )}

        <div className="pt-4">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Cardápio Baby v1.0</p>
        </div>
      </div>
    </div>
  );
}
