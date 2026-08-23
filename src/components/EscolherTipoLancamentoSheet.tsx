import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Wallet, CreditCard } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEscolher: (tipo: "conta" | "cartao") => void;
}

export function EscolherTipoLancamentoSheet({ open, onOpenChange, onEscolher }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 shadow-sheet max-w-[420px] mx-auto px-6 pt-6 pb-8"
      >
        <SheetHeader className="text-left mb-5">
          <SheetTitle className="font-serif text-2xl">O que você quer lançar?</SheetTitle>
          <p className="text-sm text-muted-foreground">Escolha como esse gasto vai ser pago 💕</p>
        </SheetHeader>

        <div className="space-y-3">
          <button
            onClick={() => onEscolher("conta")}
            className="w-full card-soft flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center shrink-0">
              <Wallet size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Conta normal</p>
              <p className="text-xs text-muted-foreground">
                Dinheiro, PIX, débito, boleto — você define o vencimento
              </p>
            </div>
          </button>

          <button
            onClick={() => onEscolher("cartao")}
            className="w-full card-soft flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-soft flex items-center justify-center shrink-0">
              <CreditCard size={22} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Gasto no cartão</p>
              <p className="text-xs text-muted-foreground">
                Reduz o saldo do cartão, com parcelas e vencimento na fatura
              </p>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
