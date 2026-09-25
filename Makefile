# EnterpriseAgentOS — root Makefile
# EAOS-specific dev stack orchestration, distinct from
# digital-employee-platform/scripts/dev-stack/run-stack.sh.
#
# Ports (defined in bin/eaos-stack/eaos-env.sh, override via env):
#   EAOS_FRONTEND_PORT   5200  (Vite dev server)
#   EAOS_LISTEN_PORT     9200  (eaos-gateway → de-app :8100 for now)
#   EAOS_EOSAPP_PORT     8200  (Python eos-app, when started)
#   EAOS_PG_PORT         5434  (EAOS Postgres, when started)

EAOS_STACK_DIR := bin/eaos-stack

.PHONY: eaos-up eaos-down eaos-status eaos-logs eaos-clean \
        help

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

eaos-up: ## Start EAOS dev stack (gateway + Vite + de-app)
	@$(EAOS_STACK_DIR)/run-eaos-stack.sh

eaos-down: ## Stop EAOS dev stack
	@$(EAOS_STACK_DIR)/stop-eaos-stack.sh

eaos-status: ## Show EAOS stack status
	@$(EAOS_STACK_DIR)/status-eaos-stack.sh

eaos-logs: ## Tail EAOS logs (gateway + vite)
	@tail -F $(EAOS_STACK_DIR)/logs/eaos-*.log

eaos-clean: ## Clean EAOS logs + pid files
	@rm -f $(EAOS_STACK_DIR)/logs/*.log $(EAOS_STACK_DIR)/logs/*.pid
	@echo "cleaned"