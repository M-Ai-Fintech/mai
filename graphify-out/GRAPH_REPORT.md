# Graph Report - .  (2026-07-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1750 nodes · 3794 edges · 115 communities (90 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9c039af`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112

## God Nodes (most connected - your core abstractions)
1. `clone()` - 40 edges
2. `MvpStore` - 36 edges
3. `DatabaseMemoryService` - 34 edges
4. `UUID` - 30 edges
5. `VDRDocument` - 25 edges
6. `MvpStoreState` - 20 edges
7. `Button` - 19 edges
8. `ISODateTime` - 18 edges
9. `ApiClient` - 18 edges
10. `Entity` - 17 edges

## Surprising Connections (you probably didn't know these)
- `AgenticWorkspace()` --indirect_call--> `request()`  [INFERRED]
  components/screens/agentic/AgenticWorkspace.tsx → lib/api-client.ts
- `BrokerOrchestratorService` --references--> `DatabaseMemoryService`  [EXTRACTED]
  agent/agents/broker-orchestrator/index.ts → core/db/DatabaseMemoryService.ts
- `startServer()` --calls--> `optimizeWithConstraints()`  [EXTRACTED]
  api/server.ts → engines/optimization/index.ts
- `ReconciliationInput` --references--> `ValuationReconciliationWeights`  [EXTRACTED]
  engines/optimization/valuation/reconciliation/index.ts → shared/types.ts
- `EnginesPage()` --references--> `ApiClient`  [EXTRACTED]
  app/deals/[id]/engines/page.tsx → lib/api-client.ts

## Import Cycles
- None detected.

## Communities (115 total, 25 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (81): advisorSummarySchema, APIErrorKind, assignmentWriteSchema, chatAgentSchema, ChatMessage, chatMessageBaseShape, chatMessageSchema, chatStreamEventSchema (+73 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (66): AssistantChatMessage, ChatMessageBase, ChatMessagePage, ChatStreamEvent, ChatStreamEventBase, CitationEvent, CreateChatThreadRequest, MessageAcceptedEvent (+58 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (32): inputSchema, memorySchema, outputSchema, inputSchema, outputSchema, synergySchema, valuationSchema, ebitdaSchema (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (21): MockVDRProvider, PapermarkAdapter, PapermarkConfig, BaseVDRProvider, VDRProvider, IDealsVDRProvider, IntralinksVDRProvider, IDealsDocument (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (36): ValuationEngine, computeBookValue(), computeDCF(), computeEbitdaMultiple(), computeEnterpriseValue(), computeTerminalValue(), computeMarketCap(), computeContingencyDeductions() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (40): countries, roles, Checkbox, CheckboxProps, CountryCode, EntitiesWorkspace(), EntitiesWorkspaceProps, FORM_ROLE_OPTIONS (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (32): defaultConfig, OptimizationConfig, Constraint, ConstraintResult, CoverageConstraint, EvaluationContext, filterFeasible(), FinancialData (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (31): EnginesPage(), DealsPage(), DealStatus, formatDate(), initials(), phaseOptions, phaseVariant(), statusOptions (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (16): src::api_contracts_chatcitation, src::api_contracts_chatmessage, src::api_contracts_chatthread, src::api_contracts_dashboardlayout, src::api_contracts_dashboardwidget, src::api_contracts_notification, src::api_contracts_notificationlistresponse, Notification (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (8): ChatMessage, ChatThread, MvpStore, ChatRepository, AgentId, CursorPage, StoredChatMessage, StoredChatThread

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (7): BrokerOrchestratorService, ContinuousLearningEngine, src::agent_index_brokerorchestratorservice, ClientSiloedRAG, VDRIntegration, CLIChat, CLICommands

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (22): Accordion(), AccordionItemData, AccordionProps, Dropdown(), Input, InputProps, AgentId, AgenticWorkspaceProps (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (19): src::api_contracts_createdealrequest, src::api_contracts_deallistquery, CreateDealRequest, DealDetail, DealListQuery, DealSummary, TransitionDealPhaseRequest, UpdateDealRequest (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (23): kpiOptions, ScreenState, ToastState, widgetOptions, Default, FinancialTableInteractive, FullCoverageTable, FullCoverageTable2 (+15 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (16): EntityRole, KybStatus, TeamMember, assertAdvisor(), EntityListQuery, EntityRepository, TeamMemberListQuery, Entity (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (22): ChatCitation, src::api_contracts_enginekind, EngineKind, GeneratedDocumentType, src::api_contracts_generateddocument, src::api_contracts_generateddocumenttype, jsonError(), src::api_contracts_jsonerror (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (24): src::api_contracts_chatstreamevent, src::api_contracts_dashboardwidgettype, jsonSuccess(), parseBooleanQuery(), src::api_contracts_jsonsuccess, agentId, createChatStreamResponse(), createThread (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (19): brokerOrchestratorAgent, DealMatchingAgent, instructions, FinancialRiskAgent, instructions, GeneralDueDiligenceAgent, instructions, instructions (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (18): verifyRegistryTool, AIProvider, AgentOrchestrator, startServer(), withMvpHeaders(), src::engines_optimization_index_coverageconstraint, src::engines_optimization_index_kycconstraint, src::engines_optimization_index_leverageconstraint (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (20): DealPage(), draftFromDeal(), EditDraft, EditErrors, formatDate(), initials(), internalNote(), ToastState (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (15): Badge(), BadgeProps, Button, ButtonProps, Card, CardProps, EmptyStateProps, ErrorBoundaryProps (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (17): COUNTRIES, CountryOption, CountrySelector(), CountrySelectorProps, DarkFooterPill, InvalidCountry, LightSurfacePill, meta (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (15): addDashboardWidget(), DashboardWidget, DashboardWidgetType, moveDashboardWidget(), reflowDashboardWidgets(), removeDashboardWidget(), resizeDashboardWidget(), first (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.26
Nodes (12): analyzeCompanyRisksTool, databaseMemoryServiceTool, geminiGoogleSearchTool, generatePdfTermSheetTool, googleCloudPubSubTool, huggingFaceMcpTool, mcpDatabaseTool, optimizePortfolioTool (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (14): TermSheetOptimizer, PortfolioCriteria, PortfolioCriteriaSchema, PortfolioResult, PortfolioResultSchema, TargetRawInput, TargetRawInputSchema, TermSheetOptimizerParams (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (17): jsonListSuccess(), jsonResponse(), parsePaginationQuery(), src::api_contracts_jsonlistsuccess, src::api_contracts_parsebooleanquery, src::api_contracts_parsepaginationquery, src::api_contracts_vdrdocument, createDocument (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (17): AGENTS, canReconnectStream(), decideStreamAction(), formatCompactMoney(), gui::components_screens_agentic_agentic_workspace_model_max_stream_reconnects, reduceStreamedReply(), StreamedReply, structureAssistantContent() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (13): src::api_contracts_apicursorsuccess, src::api_contracts_apilistsuccess, src::api_contracts_createentityrequest, src::api_contracts_dealdetail, src::api_contracts_dealteamassignment, src::api_contracts_dealteamassignmentinput, src::api_contracts_enginerun, src::api_contracts_entitydetail (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.20
Nodes (14): PredictionEngine, InputSchema, loadOnnxModel(), onnxInfer(), OnnxInput, ONNXModelInput, OnnxOutput, resetSession() (+6 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (15): Modal(), ClosedModal, Default, meta, Story, InteractiveTabs, meta, sampleTabs (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (10): src::api_contracts_apierrordetail, src::api_contracts_enginerunstatus, EngineRun, EngineRunStatus, ApiErrorDetail, getDealState(), EngineRepository, EngineRunListQuery (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (13): CLIError, chatCommand, documentCommand, interactiveCommand, kybCommand, mainCommand, negotiateCommand, portfolioCommand (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (16): tests::home_luis_mai_src_engines_optimization_valuation_index_computebookvalue, tests::home_luis_mai_src_engines_optimization_valuation_index_computechaffedlom, tests::home_luis_mai_src_engines_optimization_valuation_index_computecontingencydeductions, tests::home_luis_mai_src_engines_optimization_valuation_index_computedcf, tests::home_luis_mai_src_engines_optimization_valuation_index_computeebitdamultiple, tests::home_luis_mai_src_engines_optimization_valuation_index_computeenterprisevalue, tests::home_luis_mai_src_engines_optimization_valuation_index_computejcptaxshield, tests::home_luis_mai_src_engines_optimization_valuation_index_computemarketcap (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (17): axe-playwright, @chromatic-com/storybook, eslint, devDependencies, axe-playwright, @chromatic-com/storybook, eslint, @storybook/addon-mcp (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.34
Nodes (11): entityInput, request(), route(), tests::home_luis_mai_src_api_contracts_dashboardwidget, tests::home_luis_mai_src_api_contracts_enginekind, tests::home_luis_mai_src_api_contracts_enginerunstatus, tests::home_luis_mai_src_api_mvp_routes_handlemvproute, tests::home_luis_mai_src_api_mvp_routes_ts (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (14): src::api_contracts_assignmentside, Currency, src::api_contracts_dealphase, src::api_contracts_dealphasehistoryentry, AssignmentSide, DealPhase, DealStatus, DealType (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (4): AgentFlowWrapper, LocalPubSubBus, MessageBus, src::ref_https_deno_land_std_0_224_0_testing_asserts_ts

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (10): tests::home_luis_mai_src_core_db_setup_setupdatabase, tests::home_luis_mai_src_core_db_setup_ts, tests::home_luis_mai_src_core_db_transactionrepository_transactionrepository, tests::home_luis_mai_src_core_db_transactionrepository_ts, tests::home_luis_mai_src_core_ma_flow_madeallifecycle, tests::home_luis_mai_src_core_ma_flow_ts, tests::home_luis_mai_src_core_vdr_papermark_papermarkadapter, tests::home_luis_mai_src_core_vdr_papermark_ts (+2 more)

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (7): HybridDocumentEngine, LaTeXDocumentParams, LaTeXGenerator, TermSheetProposal, PDFGenerator, src::ref_npm_handlebars, src::ref_pdf_lib

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (9): gui::ref_node_fs, gui::ref_node_path, gui::ref_node_url, gui::ref_storybook_addon_vitest_vitest_plugin, gui::ref_vitest_browser_playwright, gui::ref_vitest_config, componentsDirectory, errors (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (6): ErrorBoundary, CustomFallback, FallbackPreview, meta, Story, gui::home_luis_mai_gui_components_errorboundary_errorboundary_stories_tsx

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (11): Spinner(), SpinnerProps, CreamLarge, FullCoverageSpinner, FullCoverageSpinner2, InkBlack, meta, SignalOrange (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (12): next, dependencies, next, react, react-dom, zod, name, private (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (6): instructions, HumanFeedback, VDRService, src::core_db_memory_service_databasememoryservice, TransformersEngine, src::ref_huggingface_transformers

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (12): src::api_contracts_currency, src::api_contracts_dealtype, assignmentSide, assignmentWrite, dealPatch, dealPhase, dealStatus, dealWrite (+4 more)

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (5): CompanyCultureMemoryRecord, DomainKnowledgeRecord, UserPreferencesRecord, TransactionRepository, src::ref_pg

### Community 49 - "Community 49"
Cohesion: 0.27
Nodes (9): IconName, breadcrumbsForPath(), navigationItemIsActive(), PRODUCT_NAVIGATION, defaultNavGroups, NavGroup, Sidebar(), SidebarProps (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (10): ButtonWithIconAndText, ConsentSignalOrange, IconButton, meta, Primary, PrimaryInkPill, SatelliteCTA, SecondaryOutlined (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (10): DisabledDropdown, EmptyAndErrorDropdown, InvalidValueMulti, InvalidValueSingle, meta, sampleOptions, SearchableAndMultiSelect, SingleSelect (+2 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (11): scripts, build, build-storybook, dev, lint, start, storybook, test-storybook (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (9): tests::home_luis_mai_src_agent_actions_vdrstructuredaccesstool, tests::home_luis_mai_src_core_vdr_providers_ideals_idealsvdrprovider, tests::home_luis_mai_src_core_vdr_providers_ideals_ts, tests::home_luis_mai_src_core_vdr_providers_intralinks_intralinksvdrprovider, tests::home_luis_mai_src_core_vdr_providers_intralinks_ts, tests::ref_https_deno_land_std_0_224_0_assert_mod_ts, idealsFixture, intralinksFixture (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (8): expectStoreError(), newEntity(), tests::home_luis_mai_src_api_contracts_assignmentside, tests::home_luis_mai_src_api_contracts_entityrole, tests::home_luis_mai_src_api_contracts_kybstatus, tests::home_luis_mai_src_api_contracts_ts, tests::home_luis_mai_src_api_mvp_store_entityinput, tests::home_luis_mai_src_api_mvp_store_mvpstoreerror

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (9): tests::home_luis_mai_src_cli_errors_clierrorhandler, tests::home_luis_mai_src_cli_errors_ts, tests::home_luis_mai_src_core_vdr_mock_mockvdrprovider, tests::home_luis_mai_src_core_vdr_mock_ts, tests::home_luis_mai_src_core_vdr_provider_basevdrprovider, tests::home_luis_mai_src_core_vdr_provider_ts, tests::home_luis_mai_src_core_vdr_types_ts, tests::home_luis_mai_src_core_vdr_types_vdrdocument (+1 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (10): tests::home_luis_mai_src_agent_agents_broker_orchestrator_index_brokerorchestratorservice, tests::home_luis_mai_src_agent_agents_broker_orchestrator_index_ts, tests::home_luis_mai_src_agent_index_agentorchestrator, tests::home_luis_mai_src_agent_index_complianceconflicterror, tests::home_luis_mai_src_agent_rag_layer_clientsiloedrag, tests::home_luis_mai_src_agent_rag_layer_ts, tests::home_luis_mai_src_core_db_memory_service_databasememoryservice, tests::home_luis_mai_src_core_db_memory_service_ts (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (8): tests::home_luis_mai_src_agent_actions_databasememoryservicetool, tests::home_luis_mai_src_agent_actions_geminigooglesearchtool, tests::home_luis_mai_src_agent_actions_googlecloudpubsubtool, tests::home_luis_mai_src_agent_actions_huggingfacemcptool, tests::home_luis_mai_src_agent_actions_mcpdatabasetool, tests::home_luis_mai_src_agent_actions_ts, tests::home_luis_mai_src_core_pubsub_localpubsubbus_localpubsubbus, tests::home_luis_mai_src_core_pubsub_localpubsubbus_ts

### Community 58 - "Community 58"
Cohesion: 0.20
Nodes (7): metadata, plusJakartaSans, publicSans, AppShell(), nextConfig, gui::ref_next, gui::ref_next_font_google

### Community 59 - "Community 59"
Cohesion: 0.20
Nodes (9): DarkBadge, Default, DefaultBadge, meta, OutlineBadge, SignalOrange, Story, WithIconBadge (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.20
Nodes (9): DarkCard, DefaultCard, DefaultHighContrast, meta, PortraitCard, RaisedCard, SignalOrangeCard, Story (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.42
Nodes (5): main(), AppBootstrapper, bootAndRun(), runE2EFlow(), simulateAgent()

### Community 62 - "Community 62"
Cohesion: 0.20
Nodes (9): tests::home_luis_mai_src_agent_index_brokerorchestratoragent, tests::home_luis_mai_src_agent_index_dealmatchingagent, tests::home_luis_mai_src_agent_index_financialriskagent, tests::home_luis_mai_src_agent_index_generalduediligenceagent, tests::home_luis_mai_src_agent_index_legalclosingagent, tests::home_luis_mai_src_agent_index_legalduediligenceagent, tests::home_luis_mai_src_agent_index_negotiationagent, tests::home_luis_mai_src_agent_index_sourcingandkybagent (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (7): Default, meta, Story, Default, meta, Story, gui::ref_storybook_react

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (8): allIconNames, AllIconsGrid, CustomSizeAndUnknown, Default, FullCoverageIcon, meta, Sizes, Story

### Community 65 - "Community 65"
Cohesion: 0.31
Nodes (7): tests::home_luis_mai_src_api_contracts_chatstreamevent, tests::home_luis_mai_src_api_contracts_currency, tests::home_luis_mai_src_api_contracts_dashboardwidgettype, tests::home_luis_mai_src_api_contracts_dealphase, tests::home_luis_mai_src_api_contracts_dealstatus, tests::home_luis_mai_src_api_contracts_dealsummary, tests::home_luis_mai_src_api_contracts_dealtype

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (7): BorderedAccordion, DefaultPropsAccordion, meta, MultiExpandAccordion, PlainAccordion, sampleItems, Story

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (6): Avatar(), AvatarProps, povOptions, TopBarProps, gui::home_luis_mai_gui_components_avatar_avatar_stories_tsx, gui::ref_next_link

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (7): DefaultFormField, meta, NonElementChildren, RequiredField, Standard, Story, ValidationError

### Community 69 - "Community 69"
Cohesion: 0.25
Nodes (7): CompleteNavigationSuite, FullCoverageSidebar, FullCoverageSidebar2, FullCoverageTopBar, meta, Story, TopBar()

### Community 70 - "Community 70"
Cohesion: 0.43
Nodes (4): DashboardLayoutRepository, defaultWidgets(), seedStore(), clone()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (4): DealHistoryEntry, MADeal, MADealLifecycle, MADealState

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (6): Footer(), CompleteFooter, DefaultFooter, meta, Story, gui::home_luis_mai_gui_components_footer_footer_stories_tsx

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (6): DefaultInput, meta, SearchPill, Story, WithError, WithIcon

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (5): Radio, RadioProps, Default, meta, Story

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (6): ErrorNotification, InfoNotification, meta, Story, SuccessNotification, WarningNotification

### Community 76 - "Community 76"
Cohesion: 0.29
Nodes (5): gui::home_luis_mai_gui_app_globals_css, gui::home_luis_mai_gui_tokens_design_tokens_css, gui::ref_storybook_nextjs_vite, config, preview

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (7): apiErrorFromResponse(), fetchWithRetry(), parseResponse(), request(), requestSignal(), sanitizeErrorMessage(), withQuery()

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (6): sampleParams, sampleProposal, tests::home_luis_mai_src_engines_document_generator_latex_latexgenerator, tests::home_luis_mai_src_engines_document_generator_latex_ts, tests::home_luis_mai_src_engines_document_generator_pdf_pdfgenerator, tests::home_luis_mai_src_engines_document_generator_pdf_ts

### Community 79 - "Community 79"
Cohesion: 0.29
Nodes (6): sampleTargets, tests::home_luis_mai_src_agent_actions_synergypricingtool, tests::home_luis_mai_src_engines_optimization_kyc_index_portfoliosolver, tests::home_luis_mai_src_engines_optimization_kyc_index_ts, tests::home_luis_mai_src_engines_optimization_matching_index_termsheetoptimizer, tests::home_luis_mai_src_engines_optimization_matching_index_ts

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (6): tests::home_luis_mai_src_engines_prediction_onnx_loadonnxmodel, tests::home_luis_mai_src_engines_prediction_onnx_onnxengine, tests::home_luis_mai_src_engines_prediction_onnx_onnxmodelinput, tests::home_luis_mai_src_engines_prediction_onnx_resetsession, tests::home_luis_mai_src_engines_prediction_onnx_ts, tests::ref_https_deno_land_std_0_224_0_testing_asserts_ts

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (6): tests::home_luis_mai_src_agent_agents_deal_matching_schemas_valuation_ts, tests::home_luis_mai_src_agent_agents_deal_matching_schemas_valuation_valuationschema, tests::home_luis_mai_src_agent_agents_general_dd_schemas_risk_matrix_riskmatrixschema, tests::home_luis_mai_src_agent_agents_general_dd_schemas_risk_matrix_ts, tests::home_luis_mai_src_agent_agents_negotiation_schemas_nash_equilibrium_nashequilibriumschema, tests::home_luis_mai_src_agent_agents_negotiation_schemas_nash_equilibrium_ts

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (5): DefaultAvatar, meta, Story, WithImage, WithInitialsFallback

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (5): Dashed, DefaultDivider, meta, Solid, Story

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (5): BreadcrumbOverride, PageBreadcrumbsContext, usePageBreadcrumbs(), Breadcrumb, Pov

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (5): Default, Disabled, meta, Story, WithError

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (5): eslintConfig, gui::ref_eslint_config, gui::ref_eslint_config_next_core_web_vitals, gui::ref_eslint_config_next_typescript, gui::ref_eslint_plugin_storybook

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (5): tests::home_luis_mai_src_api_contracts_jsonerror, tests::home_luis_mai_src_api_contracts_jsonlistsuccess, tests::home_luis_mai_src_api_contracts_jsonsuccess, tests::home_luis_mai_src_api_contracts_parsebooleanquery, tests::home_luis_mai_src_api_contracts_parsepaginationquery

### Community 89 - "Community 89"
Cohesion: 0.40
Nodes (4): CardPlaceholder, FullPropsCoverage, meta, Story

## Knowledge Gaps
- **496 isolated node(s):** `instructions`, `inputSchema`, `memorySchema`, `outputSchema`, `instructions` (+491 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FormField()` connect `Community 20` to `Community 68`, `Community 5`, `Community 7`, `Community 11`, `Community 45`, `Community 13`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `react` connect `Community 45` to `Community 20`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `instructions`, `inputSchema`, `memorySchema` to the rest of the system?**
  _496 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.022988505747126436 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.051615051615051616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.031746031746031744 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07792207792207792 - nodes in this community are weakly interconnected._