import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api(`stock/${productId}`);
      const stockAmount = stockResponse.data.amount;

      const productExists = cart.find((product) => product.id === productId);
      const currentAmount = productExists ? productExists.amount : 0;
      const newAmount = currentAmount + 1;

      if (newAmount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (currentAmount > 0) {
        updateProductAmount({ productId, amount: newAmount });
        return;
      }

      const productResponse = await api.get(`products/${productId}`);
      const product = productResponse.data;

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...cart, { ...product, amount: 1 }])
      );

      setCart((prevCart) => {
        return [...prevCart, { ...product, amount: 1 }];
      });
    } catch (error) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);
      const filteredCart = cart.filter((product) => product.id !== productId);
      if (productExists) {
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(filteredCart));
        setCart(filteredCart);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockResponse = await api(`stock/${productId}`);
      const stockAmount = stockResponse.data.amount;
      const productExists = cart.find((product) => product.id === productId);

      if (amount <= 0) {
        return;
      }

      if (stockAmount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!productExists) {
        throw new Error();
      }
      const updatedCart = cart.map((product) =>
        product.id === productId ? { ...product, amount } : product
      );
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      setCart(updatedCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
