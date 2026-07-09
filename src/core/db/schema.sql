-- src/core/db/schema.sql
-- Esquema otimizado para PostgreSQL - M&A Low-Touch Middleware (MVP Monolítico em Deno)
-- Incluí tabelas operacionais de M&A e tabelas autônomas para o Database Memory Service.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. TABELAS DE DOMÍNIO E LOOKUP (TRANSAÇÃO E NEGÓCIOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_strategy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    sector VARCHAR(100),
    origin_country VARCHAR(100) DEFAULT 'Brazil',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. TABELA CENTRAL DE TRANSAÇÃO E ESTRUTURA FINANCEIRA
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    transaction_type_id UUID REFERENCES transaction_type(id) ON DELETE RESTRICT,
    transaction_strategy_id UUID REFERENCES transaction_strategy(id) ON DELETE RESTRICT,
    transaction_status_id UUID REFERENCES transaction_status(id) ON DELETE RESTRICT,
    target_valuation NUMERIC(18, 2),
    currency VARCHAR(10) DEFAULT 'BRL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_structure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
    cash_percentage NUMERIC(5, 4) DEFAULT 0.0000, -- Ex: 0.6000 para 60%
    equity_percentage NUMERIC(5, 4) DEFAULT 0.0000,
    earn_out_percentage NUMERIC(5, 4) DEFAULT 0.0000,
    escrow_percentage NUMERIC(5, 4) DEFAULT 0.0000,
    total_valuation NUMERIC(18, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_business_role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL, -- Ex: 'BUYER', 'SELLER', 'TARGET'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id, business_id, role_name)
);

-- ============================================================================
-- 3. TABELAS DE ADVISORS (CONSELHEIROS / CONSULTORIAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS advisor_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Ex: 'Financial', 'Legal', 'Technical'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advisor_side (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Ex: 'Buy-side', 'Sell-side', 'Neutral'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advisor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    firm_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    advisor_type_id UUID REFERENCES advisor_type(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_advisor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
    advisor_id UUID NOT NULL REFERENCES advisor(id) ON DELETE CASCADE,
    advisor_side_id UUID NOT NULL REFERENCES advisor_side(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id, advisor_id)
);

-- ============================================================================
-- 4. TABELAS DE FASES E REGISTRO OPERACIONAL (PHASE HISTORY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS phase (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    stage_order INTEGER NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phase_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Ex: 'Pending', 'In Progress', 'Completed'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de registro operacional estrito do andamento das fases da transação
CREATE TABLE IF NOT EXISTS phase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES phase(id) ON DELETE RESTRICT,
    phase_status_id UUID NOT NULL REFERENCES phase_status(id) ON DELETE RESTRICT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. TABELAS AUTÔNOMAS - DATABASE MEMORY SERVICE (COM PREPARAÇÃO PG_VECTOR)
-- ============================================================================
-- Nota arquitetural: Estas tabelas operam de forma autônoma para segregar
-- o conhecimento de domínio e preferências do usuário do histórico operacional (phase_history).
-- As colunas 'embedding' estão estruturadas para futura compatibilidade com a extensão pg_vector (ex: vector(1536)).

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL UNIQUE, -- Identificador do usuário ou broker
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(384), -- Suporte ativo ao pgvector (MiniLM)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS domain_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL, -- Ex: 'Legal Clauses', 'Valuation Multipliers'
    knowledge JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(384), -- Suporte ativo ao pgvector (MiniLM)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_culture_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES business(id) ON DELETE CASCADE,
    culture_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(384), -- Suporte ativo ao pgvector (MiniLM)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vdr_document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id VARCHAR(255) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    text_chunk TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. ÍNDICES DE OTIMIZAÇÃO (FKs e GIN para JSONB)
-- ============================================================================

-- Índices em chaves estrangeiras
CREATE INDEX IF NOT EXISTS idx_transaction_type ON transaction(transaction_type_id);
CREATE INDEX IF NOT EXISTS idx_transaction_strategy ON transaction(transaction_strategy_id);
CREATE INDEX IF NOT EXISTS idx_transaction_status ON transaction(transaction_status_id);
CREATE INDEX IF NOT EXISTS idx_financial_structure_tx ON financial_structure(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_business_role_tx ON transaction_business_role(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_business_role_biz ON transaction_business_role(business_id);
CREATE INDEX IF NOT EXISTS idx_advisor_type ON advisor(advisor_type_id);
CREATE INDEX IF NOT EXISTS idx_transaction_advisor_tx ON transaction_advisor(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_advisor_adv ON transaction_advisor(advisor_id);
CREATE INDEX IF NOT EXISTS idx_phase_history_tx ON phase_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_phase_history_phase ON phase_history(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_history_status ON phase_history(phase_status_id);
CREATE INDEX IF NOT EXISTS idx_company_culture_biz ON company_culture_memory(business_id);

-- Índices GIN para buscas ultra-rápidas nos campos JSONB
CREATE INDEX IF NOT EXISTS idx_phase_history_data_gin ON phase_history USING gin (data);
CREATE INDEX IF NOT EXISTS idx_user_preferences_gin ON user_preferences USING gin (preferences);
CREATE INDEX IF NOT EXISTS idx_domain_knowledge_gin ON domain_knowledge USING gin (knowledge);
CREATE INDEX IF NOT EXISTS idx_company_culture_gin ON company_culture_memory USING gin (culture_data);

-- Índices HNSW para busca vetorial de cosseno
CREATE INDEX IF NOT EXISTS idx_user_preferences_hnsw ON user_preferences USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_domain_knowledge_hnsw ON domain_knowledge USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_company_culture_hnsw ON company_culture_memory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vdr_document_chunks_hnsw ON vdr_document_chunks USING hnsw (embedding vector_cosine_ops);
