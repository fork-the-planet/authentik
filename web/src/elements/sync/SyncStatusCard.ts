import "#components/ak-status-label";
import "#elements/EmptyState";
import "#elements/buttons/ActionButton/index";
import "#elements/events/LogViewer";

import { EVENT_REFRESH } from "#common/constants";
import { formatElapsedTime } from "#common/temporal";

import { AKElement } from "#elements/Base";
import { PaginatedResponse, Table, TableColumn } from "#elements/table/Table";

import { SyncStatus, SystemTask, SystemTaskStatusEnum } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { css, CSSResult, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import PFButton from "@patternfly/patternfly/components/Button/button.css";
import PFCard from "@patternfly/patternfly/components/Card/card.css";
import PFTable from "@patternfly/patternfly/components/Table/table.css";
import PFBase from "@patternfly/patternfly/patternfly-base.css";

@customElement("ak-sync-status-table")
export class SyncStatusTable extends Table<SystemTask> {
    @property({ attribute: false })
    tasks: SystemTask[] = [];

    expandable = true;

    static styles = [
        ...super.styles,
        css`
            code:not(:last-of-type)::after {
                content: "-";
                margin: 0 0.25rem;
            }
        `,
    ];

    async apiEndpoint(): Promise<PaginatedResponse<SystemTask>> {
        if (this.tasks.length === 1) {
            this.expandedElements = this.tasks;
        }
        return {
            pagination: {
                next: 0,
                previous: 0,
                count: this.tasks.length,
                current: 1,
                totalPages: 1,
                startIndex: 0,
                endIndex: this.tasks.length,
            },
            results: this.tasks,
        };
    }

    columns(): TableColumn[] {
        return [
            new TableColumn(msg("Task")),
            new TableColumn(msg("Status")),
            new TableColumn(msg("Finished")),
        ];
    }

    row(item: SystemTask): TemplateResult[] {
        const nameParts = item.fullName.split(":");
        nameParts.shift();
        return [
            html`<div>${item.name}</div>
                <small>${nameParts.map((part) => html`<code>${part}</code>`)}</small>`,
            html`<ak-status-label
                ?good=${item.status === SystemTaskStatusEnum.Successful}
                good-label=${msg("Finished successfully")}
                bad-label=${msg("Finished with errors")}
            ></ak-status-label>`,
            html`<div>${formatElapsedTime(item.finishTimestamp)}</div>
                <small>${item.finishTimestamp.toLocaleString()}</small>`,
        ];
    }

    renderExpanded(item: SystemTask): TemplateResult {
        return html`<td role="cell" colspan="4">
            <div class="pf-c-table__expandable-row-content">
                <ak-log-viewer .logs=${item?.messages}></ak-log-viewer>
            </div>
        </td>`;
    }

    renderToolbarContainer() {
        return html``;
    }

    renderTablePagination() {
        return html``;
    }
}

@customElement("ak-sync-status-card")
export class SyncStatusCard extends AKElement {
    @state()
    syncState?: SyncStatus;

    @state()
    loading = false;

    @property({ attribute: false })
    fetch!: () => Promise<SyncStatus>;

    @property({ attribute: false })
    triggerSync!: () => Promise<unknown>;

    static styles: CSSResult[] = [PFBase, PFButton, PFCard, PFTable];

    firstUpdated() {
        this.loading = true;
        this.fetch().then((status) => {
            this.syncState = status;
            this.loading = false;
        });
    }

    renderSyncStatus(): TemplateResult {
        if (this.loading) {
            return html`<ak-empty-state loading></ak-empty-state>`;
        }
        if (!this.syncState) {
            return html`${msg("No sync status.")}`;
        }
        if (this.syncState.isRunning) {
            return html`${msg("Sync currently running.")}`;
        }
        if (this.syncState.tasks.length < 1) {
            return html`${msg("Not synced yet.")}`;
        }
        return html`<ak-sync-status-table .tasks=${this.syncState.tasks}></ak-sync-status-table>`;
    }

    render(): TemplateResult {
        return html`<div class="pf-c-card">
            <div class="pf-c-card__header">
                <div class="pf-c-card__actions">
                    <button
                        class="pf-c-button pf-m-plain"
                        type="button"
                        @click=${() => {
                            this.fetch();
                        }}
                    >
                        <i class="fa fa-sync"></i>
                    </button>
                </div>
                <div class="pf-c-card__title">${msg("Sync status")}</div>
            </div>
            <div class="pf-c-card__body">${this.renderSyncStatus()}</div>
            <div class="pf-c-card__footer">
                <ak-action-button
                    class="pf-m-secondary"
                    ?disabled=${this.syncState?.isRunning}
                    .apiRequest=${() => {
                        if (this.syncState) {
                            // This is a bit of a UX cheat, we set isRunning to true to disable the button
                            // and change the text even before we hear back from the backend
                            this.syncState = {
                                ...this.syncState,
                                isRunning: true,
                            };
                        }
                        this.triggerSync().then(() => {
                            this.dispatchEvent(
                                new CustomEvent(EVENT_REFRESH, {
                                    bubbles: true,
                                    composed: true,
                                }),
                            );
                            this.firstUpdated();
                        });
                    }}
                >
                    ${this.syncState?.isRunning
                        ? msg("Sync currently running")
                        : msg("Run sync again")}
                </ak-action-button>
            </div>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-sync-status-table": SyncStatusTable;
        "ak-sync-status-card": SyncStatusCard;
    }
}
