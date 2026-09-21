-- Remove existing entrada_crediario sales records
DELETE FROM sales WHERE payment_method = 'entrada_crediario';