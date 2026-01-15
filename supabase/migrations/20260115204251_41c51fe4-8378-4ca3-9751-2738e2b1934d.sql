-- Create settings table for system configuration
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage settings
CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create policy for all authenticated users to read settings
CREATE POLICY "Authenticated users can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
  ('dojo_name', 'Dojo Manager', 'Nome do dojo exibido no sistema'),
  ('dojo_address', '', 'Endereço do dojo'),
  ('dojo_phone', '', 'Telefone de contato do dojo'),
  ('dojo_email', '', 'Email de contato do dojo'),
  ('monthly_fee', '150.00', 'Valor padrão da mensalidade'),
  ('pix_key', 'etorevasconcelos36@gmail.com', 'Chave Pix para pagamentos'),
  ('payment_due_day', '10', 'Dia de vencimento da mensalidade'),
  ('welcome_message', 'Bem-vindo ao sistema de gestão do dojo', 'Mensagem de boas-vindas exibida no dashboard');