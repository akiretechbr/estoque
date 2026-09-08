# Dashboard de estoque Olist

Painel público que lista produtos ativos cujo saldo atual está igual ou abaixo do estoque mínimo cadastrado no Olist ERP.

## Configuração obrigatória

1. Abra **Settings > Secrets and variables > Actions** neste repositório.
2. Crie um segredo chamado `OLIST_API_TOKEN` e cole nele o Token API do Olist ERP.
3. Abra **Settings > Pages** e selecione **Deploy from a branch**, branch `main` e pasta `/ (root)`.
4. Em **Actions**, execute manualmente **Atualizar estoque Olist** para testar a primeira carga.

## Atualização

A rotina é executada diariamente às 08h no horário de Brasília (cron às 11:00 UTC) e também pode ser acionada manualmente em **Actions > Atualizar estoque Olist > Run workflow**.

O token nunca é gravado no repositório. O arquivo público `data/estoque.json` contém somente identificação do produto, SKU, unidade, saldo e estoque mínimo.
