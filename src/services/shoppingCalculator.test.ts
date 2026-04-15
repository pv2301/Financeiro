import { describe, it, expect } from 'vitest';
import { calculateShoppingList, computeMenuAnalytics } from './shoppingCalculator';
import { MenuDay, Item, Recipe, GroupConfig, GroupCapacity } from '../types';

describe('shoppingCalculator', () => {
  describe('calculateShoppingList', () => {
    it('should correctly calculate quantities based on group capacity', () => {
      const items: Item[] = [
        { id: '1', nome: 'Maçã', categoria: 'Fruta', cor: '#fff', marketCategory: 'Hortifrúti', unitType: 'un', portionSize: 1 },
        { id: '2', nome: 'Arroz', categoria: 'Cereal', cor: '#fff', marketCategory: 'Grãos e Cereais', unitType: 'kg', portionSize: 0.1 }
      ];
      
      const recipes: Recipe[] = [];
      const groups: GroupConfig[] = [
        { id: 'g1', nomeCurto: 'G1', nomeCompleto: 'Grupo 1', cor: '#000', colunas: [] },
        { id: 'g2', nomeCurto: 'G2', nomeCompleto: 'Grupo 2', cor: '#000', colunas: [] }
      ];
      
      const groupCapacities: GroupCapacity[] = [
        { groupId: 'g1', childrenCount: 10 },
        { groupId: 'g2', childrenCount: 15 } // 25 children in total
      ];

      // G1 gets both items, G2 gets only Arroz
      const menus: MenuDay[] = [
        {
          id: 'menu-1', date: '2026-04-01', dayOfWeek: 3, 
          type: 'planned', groupId: 'g1',
          refeicoes: {
            'Lanche': { pratoPrincipalId: '1' }, // 10 maçãs
            'Almoço': { pratoPrincipalId: '2' } // 10 * 0.1kg = 1kg arroz
          }
        },
        {
          id: 'menu-2', date: '2026-04-01', dayOfWeek: 3,
          type: 'planned', groupId: 'g2',
          refeicoes: {
            'Almoço': { pratoPrincipalId: '2' } // 15 * 0.1kg = 1.5kg arroz
          }
        }
      ];

      const shoppingList = calculateShoppingList({
        menuDays: menus,
        items,
        recipes,
        groups,
        capacities: groupCapacities,
        portionOverrides: {}
      });

      // Assertions
      const maca = shoppingList.find(i => i.nome === 'Maçã');
      expect(maca).toBeDefined();
      expect(maca?.quantidadeTotal).toBe(10); // 10 unidades

      const arroz = shoppingList.find(i => i.nome === 'Arroz');
      expect(arroz).toBeDefined();
      expect(arroz?.quantidadeTotal).toBeCloseTo(2.5, 2); // 2.5 kg
    });

    it('should correctly handle recipe ingredients', () => {
      const items: Item[] = [
        { id: 'i1', nome: 'Carne Moída', categoria: 'Carne', cor: '#fff', marketCategory: 'Carnes', unitType: 'kg', portionSize: 0.1 },
        { id: 'i2', nome: 'Cebola', categoria: 'Verdura', cor: '#fff', marketCategory: 'Hortifrúti', unitType: 'kg', portionSize: 0.02 }
      ];
      
      const recipes: Recipe[] = [
        {
          id: 'r1', nome: 'Almôndegas', tipo: 'Prato Principal', cor: '#fff', rating: 5,
          rendimento: 10, unitType: 'porcoes', preparo: '', lastUsed: '',
          ingredientes: [
            { itemId: 'i1', quantidade: 1, unit: 'kg' }, // 1kg yields 10 portions (0.1kg per portion)
            { itemId: 'i2', quantidade: 0.2, unit: 'kg' } // 0.2kg yields 10 portions (0.02kg per portion)
          ]
        }
      ];

      const groups: GroupConfig[] = [
        { id: 'g1', nomeCurto: 'G1', nomeCompleto: 'Grupo 1', cor: '#000', colunas: [] }
      ];
      
      const groupCapacities: GroupCapacity[] = [
        { groupId: 'g1', childrenCount: 20 }
      ];

      const menus: MenuDay[] = [
        {
          id: 'menu-1', date: '2026-04-01', dayOfWeek: 3, 
          type: 'planned', groupId: 'g1',
          refeicoes: {
            'Almoço': { pratoPrincipalId: 'r1' } // 20 portions of Almôndegas
          }
        }
      ];

      // Note: recipe resolution is not implemented in the current code, but we mock items anyway
      const shoppingList = calculateShoppingList({
        menuDays: menus, items, recipes, groups, capacities: groupCapacities, portionOverrides: {}
      });

      const carne = shoppingList.find(i => i.nome === 'Carne Moída');
      expect(carne).toBeDefined();
      expect(carne?.quantidadeTotal).toBeCloseTo(2, 2); // 20 children * 0.1kg = 2kg

      const cebola = shoppingList.find(i => i.nome === 'Cebola');
      expect(cebola).toBeDefined();
      expect(cebola?.quantidadeTotal).toBeCloseTo(0.4, 2); // 20 children * 0.02kg = 0.4kg
    });
  });

  describe('computeMenuAnalytics', () => {
    it('should count category distribution and top items', () => {
      const menus: MenuDay[] = [
        {
          id: 'menu-1', date: '2026-04-01', dayOfWeek: 3, 
          type: 'planned', groupId: 'g1',
          refeicoes: {
            'Ref1': { pratoPrincipalId: 'i1', acompanhamentoId: 'i2' }
          }
        },
        {
          id: 'menu-2', date: '2026-04-02', dayOfWeek: 4, 
          type: 'planned', groupId: 'g1',
          refeicoes: {
            'Ref1': { pratoPrincipalId: 'i1', acompanhamentoId: 'i3' }
          }
        }
      ];

      const items: Item[] = [
        { id: 'i1', nome: 'Frango', categoria: 'Carne', cor: '#fff' },
        { id: 'i2', nome: 'Arroz', categoria: 'Cereal', cor: '#fff' },
        { id: 'i3', nome: 'Feijão', categoria: 'Leguminosa', cor: '#fff' }
      ];

      const analytics = computeMenuAnalytics(menus, items, '2026-04');

      expect(analytics.totalDias).toBe(2);
      expect(analytics.categoriaDistribuicao['Carne']).toBe(2);
      expect(analytics.categoriaDistribuicao['Cereal']).toBe(1);
      expect(analytics.categoriaDistribuicao['Leguminosa']).toBe(1);

      expect(analytics.topItens[0].nome).toBe('Frango');
      expect(analytics.topItens[0].aparicoes).toBe(2);
    });
  });
});
