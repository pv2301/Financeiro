import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Item, Recipe, Substitution, MenuDay, GroupConfig, Restriction, MenuSnapshot, CategorySubcategories, GroupCapacity, UnitType } from '../types';

const COLLECTIONS = {
  ITEMS: 'items',
  RECIPES: 'recipes',
  SUBSTITUTIONS: 'substitutions',
  MENU: 'menu',
  GROUPS: 'groups',
  CONFIG: 'config',
};

async function getAllFromCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => doc.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
    return [];
  }
}

async function saveAllToCollection<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // First, delete existing docs (this is a simple way to sync, though not most efficient)
    // For a real app, we'd only update/delete what changed.
    const existingDocs = await getDocs(collection(db, collectionName));
    existingDocs.forEach((d) => {
      batch.delete(d.ref);
    });

    // Add new docs (strip undefined values — Firestore rejects them)
    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, JSON.parse(JSON.stringify(item)));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

async function getConfigValue<T>(id: string, defaultValue: T): Promise<T> {
  try {
    const docRef = doc(db, COLLECTIONS.CONFIG, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().value as T;
    }
    return defaultValue;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.CONFIG}/${id}`);
    return defaultValue;
  }
}

async function setConfigValue<T>(id: string, value: T): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONFIG, id);
    await setDoc(docRef, { value });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTIONS.CONFIG}/${id}`);
  }
}

/**
 * Resolve uma categoria ou subcategoria para sua categoria principal
 * @param categoryOrSubcategory - Categoria ou subcategoria
 * @param categorySubcategories - Mapeamento de categorias para subcategorias
 * @returns A categoria principal
 * 
 * Exemplo:
 * categorySubcategories = { "Lanche": ["Lanche Manhã", "Lanche Tarde"] }
 * resolveMainCategory("Lanche Manhã", categorySubcategories) → "Lanche"
 * resolveMainCategory("Lanche", categorySubcategories) → "Lanche"
 */
export function resolveMainCategory(
  categoryOrSubcategory: string,
  categorySubcategories: CategorySubcategories
): string {
  // Se não for subcategoria, retorna a própria categoria
  for (const [mainCategory, subcategories] of Object.entries(categorySubcategories)) {
    if (subcategories.includes(categoryOrSubcategory)) {
      return mainCategory;
    }
  }
  return categoryOrSubcategory;
}

export const storage = {
  getItems: () => getAllFromCollection<Item>(COLLECTIONS.ITEMS),
  saveItems: (items: Item[]) => saveAllToCollection(COLLECTIONS.ITEMS, items),
  
  getRecipes: () => getAllFromCollection<Recipe>(COLLECTIONS.RECIPES),
  saveRecipes: (recipes: Recipe[]) => saveAllToCollection(COLLECTIONS.RECIPES, recipes),
  
  getSubstitutions: () => getAllFromCollection<Substitution>(COLLECTIONS.SUBSTITUTIONS),
  saveSubstitutions: (subs: Substitution[]) => saveAllToCollection(COLLECTIONS.SUBSTITUTIONS, subs),
  
  getMenu: () => getAllFromCollection<MenuDay>(COLLECTIONS.MENU),
  saveMenu: (menu: MenuDay[]) => saveAllToCollection(COLLECTIONS.MENU, menu),
  
  getConfig: () => getAllFromCollection<GroupConfig>(COLLECTIONS.GROUPS),
  saveConfig: (config: GroupConfig[]) => saveAllToCollection(COLLECTIONS.GROUPS, config),

  getRestrictions: () => getConfigValue<Restriction[]>('restrictions', []),
  saveRestrictions: (restrictions: Restriction[]) => setConfigValue('restrictions', restrictions),

  getCategories: () => getConfigValue<string[]>('categories', []),
  saveCategories: (categories: string[]) => setConfigValue('categories', categories),

  getCategorySubcategories: () => getConfigValue<CategorySubcategories>('categorySubcategories', {}),
  saveCategorySubcategories: (data: CategorySubcategories) => setConfigValue('categorySubcategories', data),

  getLogo: () => getConfigValue<string | null>('logo', null),
  saveLogo: (logo: string | null) => setConfigValue('logo', logo),

  getNutricionista: () => getConfigValue<{nome: string, crn: string}>('nutricionista', {nome: '', crn: ''}),
  saveNutricionista: (data: {nome: string, crn: string}) => setConfigValue('nutricionista', data),

  getGeminiApiKey: () => getConfigValue<string>('geminiApiKey', ''),
  saveGeminiApiKey: (key: string) => setConfigValue('geminiApiKey', key),

  /** Group child-count capacities — edited in Groups page, read by ShoppingList */
  getGroupCapacities: () => getConfigValue<GroupCapacity[]>('groupCapacities', []),
  saveGroupCapacities: (caps: GroupCapacity[]) => setConfigValue('groupCapacities', caps),

  /**
   * Per-item shopping overrides: { [itemId]: { unitType, portionSize } }
   * Edited inline on the Shopping List page and persisted between sessions.
   */
  getItemPortions: () =>
    getConfigValue<Record<string, { unitType: UnitType; portionSize: number }>>('itemPortions', {}),
  saveItemPortions: (
    portions: Record<string, { unitType: UnitType; portionSize: number }>
  ) => setConfigValue('itemPortions', portions),

  addMenuSnapshot: async (snapshot: MenuSnapshot): Promise<void> => {
    try {
      const ref = doc(collection(db, 'menuSnapshots'), snapshot.id);
      await setDoc(ref, JSON.parse(JSON.stringify(snapshot)));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'menuSnapshots');
    }
  },

  getMenuSnapshots: async (): Promise<MenuSnapshot[]> => {
    try {
      const snap = await getDocs(collection(db, 'menuSnapshots'));
      return snap.docs
        .map(d => d.data() as MenuSnapshot)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'menuSnapshots');
      return [];
    }
  },

  deleteMenuSnapshot: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'menuSnapshots', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'menuSnapshots');
    }
  },
};
