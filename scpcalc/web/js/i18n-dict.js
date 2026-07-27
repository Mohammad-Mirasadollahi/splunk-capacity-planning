/* i18n-dict.js — barrel: merges language modules under ./i18n-dict/{en,fa}/ */

import { shell as en_shell } from "./i18n-dict/en/01-shell.js";
import { overview_quick as en_overview_quick } from "./i18n-dict/en/02-overview-quick.js";
import { errors_budget as en_errors_budget } from "./i18n-dict/en/03-errors-budget.js";
import { topology as en_topology } from "./i18n-dict/en/04-topology.js";
import { volume_fields as en_volume_fields } from "./i18n-dict/en/05-volume-fields.js";
import { context_review as en_context_review } from "./i18n-dict/en/06-context-review.js";
import { sources_table as en_sources_table } from "./i18n-dict/en/07-sources-table.js";
import { results_charts as en_results_charts } from "./i18n-dict/en/08-results-charts.js";
import { indexes as en_indexes } from "./i18n-dict/en/09-indexes.js";
import { misc as en_misc } from "./i18n-dict/en/10-misc.js";

import { shell as fa_shell } from "./i18n-dict/fa/01-shell.js";
import { overview_quick as fa_overview_quick } from "./i18n-dict/fa/02-overview-quick.js";
import { errors_budget as fa_errors_budget } from "./i18n-dict/fa/03-errors-budget.js";
import { topology as fa_topology } from "./i18n-dict/fa/04-topology.js";
import { volume_fields as fa_volume_fields } from "./i18n-dict/fa/05-volume-fields.js";
import { context_review as fa_context_review } from "./i18n-dict/fa/06-context-review.js";
import { sources_table as fa_sources_table } from "./i18n-dict/fa/07-sources-table.js";
import { results_charts as fa_results_charts } from "./i18n-dict/fa/08-results-charts.js";
import { indexes as fa_indexes } from "./i18n-dict/fa/09-indexes.js";
import { misc as fa_misc } from "./i18n-dict/fa/10-misc.js";

export const I18N = {
  en: {
    ...en_shell,
    ...en_overview_quick,
    ...en_errors_budget,
    ...en_topology,
    ...en_volume_fields,
    ...en_context_review,
    ...en_sources_table,
    ...en_results_charts,
    ...en_indexes,
    ...en_misc,
  },
  fa: {
    ...fa_shell,
    ...fa_overview_quick,
    ...fa_errors_budget,
    ...fa_topology,
    ...fa_volume_fields,
    ...fa_context_review,
    ...fa_sources_table,
    ...fa_results_charts,
    ...fa_indexes,
    ...fa_misc,
  },
};
