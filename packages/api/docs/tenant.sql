--
-- PostgreSQL database dump
--

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 17.0

-- Started on 2026-02-18 10:22:55 WAT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 11 (class 2615 OID 41940)
-- Name: topology; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO postgres;

--
-- TOC entry 5557 (class 0 OID 0)
-- Dependencies: 11
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- TOC entry 2 (class 3079 OID 40864)
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- TOC entry 5558 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- TOC entry 5 (class 3079 OID 42132)
-- Name: postgis_raster; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_raster WITH SCHEMA public;


--
-- TOC entry 5559 (class 0 OID 0)
-- Dependencies: 5
-- Name: EXTENSION postgis_raster; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_raster IS 'PostGIS raster types and functions';


--
-- TOC entry 4 (class 3079 OID 42107)
-- Name: postgis_sfcgal; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_sfcgal WITH SCHEMA public;


--
-- TOC entry 5560 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION postgis_sfcgal; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_sfcgal IS 'PostGIS SFCGAL functions';


--
-- TOC entry 3 (class 3079 OID 41941)
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- TOC entry 5561 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- TOC entry 6 (class 3079 OID 42689)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5562 (class 0 OID 0)
-- Dependencies: 6
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 2392 (class 1247 OID 42928)
-- Name: enum_tk_memos_memo_status; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_tk_memos_memo_status AS ENUM (
    'submitted',
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.enum_tk_memos_memo_status OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2389 (class 1247 OID 42914)
-- Name: enum_tk_memos_memo_type; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_tk_memos_memo_type AS ENUM (
    'delay_justification',
    'absence_justification',
    'correction_request',
    'session_closure',
    'auto_generated',
    'other'
);


ALTER TYPE public.enum_tk_memos_memo_type OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2413 (class 1247 OID 43092)
-- Name: enum_tk_time_entries_pointage_status; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_tk_time_entries_pointage_status AS ENUM (
    'draft',
    'pending',
    'accepted',
    'corrected',
    'accounted',
    'rejected'
);


ALTER TYPE public.enum_tk_time_entries_pointage_status OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2410 (class 1247 OID 43078)
-- Name: enum_tk_time_entries_pointage_type; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_tk_time_entries_pointage_type AS ENUM (
    'clock_in',
    'clock_out',
    'pause_start',
    'pause_end',
    'external_mission',
    'external_mission_end'
);


ALTER TYPE public.enum_tk_time_entries_pointage_type OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2404 (class 1247 OID 43041)
-- Name: enum_xa_device_device_type; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_xa_device_device_type AS ENUM (
    'ANDROID',
    'IOS',
    'OTHER'
);


ALTER TYPE public.enum_xa_device_device_type OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2443 (class 1247 OID 43386)
-- Name: enum_xa_poste_level; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_xa_poste_level AS ENUM (
    'JUNIOR',
    'MEDIUM',
    'SENIOR',
    'MANAGER',
    'DIRECTOR',
    'HEAD',
    'CEO',
    'CTO',
    'CFO',
    'UNKNOWN'
);


ALTER TYPE public.enum_xa_poste_level OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2428 (class 1247 OID 43255)
-- Name: enum_xa_rotation_groups_cycle_unit; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_xa_rotation_groups_cycle_unit AS ENUM (
    'day',
    'week'
);


ALTER TYPE public.enum_xa_rotation_groups_cycle_unit OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2377 (class 1247 OID 42821)
-- Name: enum_xa_sites_site_type; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_xa_sites_site_type AS ENUM (
    'manager_site',
    'global_site',
    'temporary_site',
    'public_site'
);


ALTER TYPE public.enum_xa_sites_site_type OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 2383 (class 1247 OID 42869)
-- Name: enum_xa_work_sessions_session_status; Type: TYPE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TYPE public.enum_xa_work_sessions_session_status AS ENUM (
    'open',
    'closed',
    'abandoned',
    'corrected'
);


ALTER TYPE public.enum_xa_work_sessions_session_status OWNER TO imediatis_sarl_user_f04d;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 253 (class 1259 OID 42938)
-- Name: tk_memos; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.tk_memos (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    author_user integer NOT NULL,
    target_user integer,
    validator_user integer,
    memo_type public.enum_tk_memos_memo_type NOT NULL,
    memo_status public.enum_tk_memos_memo_status NOT NULL,
    title character varying(200) NOT NULL,
    incident_datetime timestamp with time zone,
    affected_session integer,
    affected_entries integer[],
    auto_generated boolean DEFAULT false NOT NULL,
    details text,
    memo_content jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.tk_memos OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5563 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE tk_memos; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.tk_memos IS 'Memos table for employee requests, manager requests, and system anomalies';


--
-- TOC entry 5564 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.id IS 'Memo ID';


--
-- TOC entry 5565 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5566 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.author_user; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.author_user IS 'Users';


--
-- TOC entry 5567 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.target_user; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.target_user IS 'Users';


--
-- TOC entry 5568 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.validator_user; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.validator_user IS 'Users';


--
-- TOC entry 5569 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.memo_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.memo_type IS 'Memo type';


--
-- TOC entry 5570 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.memo_status; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.memo_status IS 'Memo status';


--
-- TOC entry 5571 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.title; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.title IS 'Memo title';


--
-- TOC entry 5572 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.incident_datetime; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.incident_datetime IS 'Incident date and time';


--
-- TOC entry 5573 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.affected_session; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.affected_session IS 'Affected work session';


--
-- TOC entry 5574 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.affected_entries; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.affected_entries IS 'Affected entries IDs';


--
-- TOC entry 5575 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.auto_generated; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.auto_generated IS 'Auto generated';


--
-- TOC entry 5576 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.details; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.details IS 'Additional details from system (for anomalies)';


--
-- TOC entry 5577 (class 0 OID 0)
-- Dependencies: 253
-- Name: COLUMN tk_memos.memo_content; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_memos.memo_content IS 'Historique des messages (timeline)';


--
-- TOC entry 252 (class 1259 OID 42937)
-- Name: tk_memos_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.tk_memos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tk_memos_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5578 (class 0 OID 0)
-- Dependencies: 252
-- Name: tk_memos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.tk_memos_id_seq OWNED BY public.tk_memos.id;


--
-- TOC entry 261 (class 1259 OID 43106)
-- Name: tk_time_entries; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.tk_time_entries (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    session integer NOT NULL,
    "user" integer NOT NULL,
    site integer NOT NULL,
    pointage_type public.enum_tk_time_entries_pointage_type NOT NULL,
    pointage_status public.enum_tk_time_entries_pointage_status DEFAULT 'pending'::public.enum_tk_time_entries_pointage_status NOT NULL,
    clocked_at timestamp with time zone NOT NULL,
    real_clocked_at timestamp with time zone,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    gps_accuracy integer,
    device integer NOT NULL,
    device_info jsonb,
    ip_address text,
    user_agent text,
    created_offline boolean DEFAULT false NOT NULL,
    local_id character varying(50),
    sync_attempts integer DEFAULT 0 NOT NULL,
    last_sync_attempt timestamp with time zone,
    memo integer,
    qr_code integer,
    correction_reason text,
    server_received_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.tk_time_entries OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5579 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE tk_time_entries; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.tk_time_entries IS 'Time entries table with validation information';


--
-- TOC entry 5580 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.id IS 'Time entry ID';


--
-- TOC entry 5581 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5582 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.session; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.session IS 'Work sessions';


--
-- TOC entry 5583 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries."user"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries."user" IS 'Users';


--
-- TOC entry 5584 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.site; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.site IS 'Sites';


--
-- TOC entry 5585 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.pointage_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.pointage_type IS 'Pointage type';


--
-- TOC entry 5586 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.pointage_status; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.pointage_status IS 'Pointage status';


--
-- TOC entry 5587 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.clocked_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.clocked_at IS 'Clocked date';


--
-- TOC entry 5588 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.real_clocked_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.real_clocked_at IS 'Real clocked date';


--
-- TOC entry 5589 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.latitude; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.latitude IS 'Latitude';


--
-- TOC entry 5590 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.longitude; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.longitude IS 'Longitude';


--
-- TOC entry 5591 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.gps_accuracy; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.gps_accuracy IS 'Geolocation accuracy';


--
-- TOC entry 5592 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.device; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.device IS 'Devices';


--
-- TOC entry 5593 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.device_info; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.device_info IS 'Device information';


--
-- TOC entry 5594 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.ip_address; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.ip_address IS 'IP address (IPv4 or IPv6)';


--
-- TOC entry 5595 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.user_agent; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.user_agent IS 'User agent';


--
-- TOC entry 5596 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.created_offline; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.created_offline IS 'Created offline';


--
-- TOC entry 5597 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.local_id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.local_id IS 'Local ID';


--
-- TOC entry 5598 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.sync_attempts; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.sync_attempts IS 'Sync attempts';


--
-- TOC entry 5599 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.last_sync_attempt; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.last_sync_attempt IS 'Sync last attempt date';


--
-- TOC entry 5600 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.memo; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.memo IS 'Memos';


--
-- TOC entry 5601 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.qr_code; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.qr_code IS 'QR_Code';


--
-- TOC entry 5602 (class 0 OID 0)
-- Dependencies: 261
-- Name: COLUMN tk_time_entries.correction_reason; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.tk_time_entries.correction_reason IS 'Correction reason';


--
-- TOC entry 260 (class 1259 OID 43105)
-- Name: tk_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.tk_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tk_time_entries_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5603 (class 0 OID 0)
-- Dependencies: 260
-- Name: tk_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.tk_time_entries_id_seq OWNED BY public.tk_time_entries.id;


--
-- TOC entry 263 (class 1259 OID 43173)
-- Name: xa_audit_logs; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_audit_logs (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    table_name character varying(50) NOT NULL,
    record integer NOT NULL,
    record_guid uuid,
    operation character varying(10) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by_user integer,
    changed_by_type character varying(20),
    change_reason text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_audit_logs OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5604 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE xa_audit_logs; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_audit_logs IS 'Audit logs table with validation information';


--
-- TOC entry 5605 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.id IS 'Audit log ID';


--
-- TOC entry 5606 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5607 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.table_name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.table_name IS 'Table name';


--
-- TOC entry 5608 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.record; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.record IS 'Record ID';


--
-- TOC entry 5609 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.record_guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.record_guid IS 'Record GUID';


--
-- TOC entry 5610 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.operation; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.operation IS 'Operation (INSERT, UPDATE, DELETE)';


--
-- TOC entry 5611 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.old_values; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.old_values IS 'Old values';


--
-- TOC entry 5612 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.new_values; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.new_values IS 'New values';


--
-- TOC entry 5613 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.changed_by_user; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.changed_by_user IS 'User';


--
-- TOC entry 5614 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.changed_by_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.changed_by_type IS 'Changed by type (user, system, api)';


--
-- TOC entry 5615 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.change_reason; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.change_reason IS 'Change reason';


--
-- TOC entry 5616 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.ip_address; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.ip_address IS 'IP address (IPv4 or IPv6)';


--
-- TOC entry 5617 (class 0 OID 0)
-- Dependencies: 263
-- Name: COLUMN xa_audit_logs.user_agent; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_audit_logs.user_agent IS 'User agent';


--
-- TOC entry 262 (class 1259 OID 43172)
-- Name: xa_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_audit_logs_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5618 (class 0 OID 0)
-- Dependencies: 262
-- Name: xa_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_audit_logs_id_seq OWNED BY public.xa_audit_logs.id;


--
-- TOC entry 275 (class 1259 OID 43363)
-- Name: xa_department; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_department (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    manager integer,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_department OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5619 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE xa_department; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_department IS 'Department table with validation information';


--
-- TOC entry 5620 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.id IS 'Department ID';


--
-- TOC entry 5621 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5622 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.name IS 'Department name';


--
-- TOC entry 5623 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.code; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.code IS 'Department code';


--
-- TOC entry 5624 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.description; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.description IS 'Department description';


--
-- TOC entry 5625 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.manager; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.manager IS 'Manager of the department';


--
-- TOC entry 5626 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.active IS 'Department status';


--
-- TOC entry 5627 (class 0 OID 0)
-- Dependencies: 275
-- Name: COLUMN xa_department.deleted_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_department.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 274 (class 1259 OID 43362)
-- Name: xa_department_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_department_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_department_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5628 (class 0 OID 0)
-- Dependencies: 274
-- Name: xa_department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_department_id_seq OWNED BY public.xa_department.id;


--
-- TOC entry 259 (class 1259 OID 43048)
-- Name: xa_device; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_device (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    device_type public.enum_xa_device_device_type DEFAULT 'OTHER'::public.enum_xa_device_device_type NOT NULL,
    assigned_to integer NOT NULL,
    gps_accuracy integer,
    custom_geofence_radius integer,
    last_seen_at timestamp with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    config_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_device OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5629 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE xa_device; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_device IS 'Device table for user';


--
-- TOC entry 5630 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.id IS 'Device ID';


--
-- TOC entry 5631 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5632 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.name IS 'Device Name';


--
-- TOC entry 5633 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.device_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.device_type IS 'Device Type';


--
-- TOC entry 5634 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.assigned_to; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.assigned_to IS 'users';


--
-- TOC entry 5635 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.gps_accuracy; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.gps_accuracy IS 'Geolocation accuracy';


--
-- TOC entry 5636 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.custom_geofence_radius; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.custom_geofence_radius IS 'Device Geolocation radius';


--
-- TOC entry 5637 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.last_seen_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.last_seen_at IS 'Device last seen at';


--
-- TOC entry 5638 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.active IS 'Active device status';


--
-- TOC entry 5639 (class 0 OID 0)
-- Dependencies: 259
-- Name: COLUMN xa_device.config_by; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_device.config_by IS 'device config by';


--
-- TOC entry 258 (class 1259 OID 43047)
-- Name: xa_device_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_device_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_device_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5640 (class 0 OID 0)
-- Dependencies: 258
-- Name: xa_device_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_device_id_seq OWNED BY public.xa_device.id;


--
-- TOC entry 265 (class 1259 OID 43197)
-- Name: xa_fraud_alerts; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_fraud_alerts (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    "user" integer NOT NULL,
    time_entry integer NOT NULL,
    alert_type character varying(50) NOT NULL,
    alert_severity character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    alert_description text NOT NULL,
    alert_data jsonb,
    investigated boolean DEFAULT false NOT NULL,
    investigation_notes text,
    false_positive boolean DEFAULT false NOT NULL,
    investigated_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_fraud_alerts OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5641 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE xa_fraud_alerts; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_fraud_alerts IS 'Fraud alerts table with validation information';


--
-- TOC entry 5642 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.id IS 'Fraud alert ID';


--
-- TOC entry 5643 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5644 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts."user"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts."user" IS 'Users';


--
-- TOC entry 5645 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.time_entry; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.time_entry IS 'Time entries';


--
-- TOC entry 5646 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.alert_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.alert_type IS 'Alert type';


--
-- TOC entry 5647 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.alert_severity; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.alert_severity IS 'Alert severity';


--
-- TOC entry 5648 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.alert_description; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.alert_description IS 'Alert description';


--
-- TOC entry 5649 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.alert_data; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.alert_data IS 'Alert data';


--
-- TOC entry 5650 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.investigated; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.investigated IS 'Is investigated';


--
-- TOC entry 5651 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.investigation_notes; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.investigation_notes IS 'Investigation notes';


--
-- TOC entry 5652 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.false_positive; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.false_positive IS 'Is false positive';


--
-- TOC entry 5653 (class 0 OID 0)
-- Dependencies: 265
-- Name: COLUMN xa_fraud_alerts.investigated_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_fraud_alerts.investigated_at IS 'Investigated at';


--
-- TOC entry 264 (class 1259 OID 43196)
-- Name: xa_fraud_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_fraud_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_fraud_alerts_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5654 (class 0 OID 0)
-- Dependencies: 264
-- Name: xa_fraud_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_fraud_alerts_id_seq OWNED BY public.xa_fraud_alerts.id;


--
-- TOC entry 255 (class 1259 OID 42988)
-- Name: xa_groups; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_groups (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    name character varying(128) NOT NULL,
    manager integer NOT NULL,
    members jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.xa_groups OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5655 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE xa_groups; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_groups IS 'Groups table with validation information';


--
-- TOC entry 5656 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN xa_groups.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_groups.id IS 'Groups ID';


--
-- TOC entry 5657 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN xa_groups.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_groups.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5658 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN xa_groups.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_groups.name IS 'Groups name';


--
-- TOC entry 5659 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN xa_groups.manager; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_groups.manager IS 'Manager ID';


--
-- TOC entry 5660 (class 0 OID 0)
-- Dependencies: 255
-- Name: COLUMN xa_groups.members; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_groups.members IS 'List of members of the groups';


--
-- TOC entry 254 (class 1259 OID 42987)
-- Name: xa_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_groups_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5661 (class 0 OID 0)
-- Dependencies: 254
-- Name: xa_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_groups_id_seq OWNED BY public.xa_groups.id;


--
-- TOC entry 247 (class 1259 OID 42789)
-- Name: xa_org_hierarchy; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_org_hierarchy (
    id smallint NOT NULL,
    guid character varying(128) NOT NULL,
    subordinate integer NOT NULL,
    supervisor integer NOT NULL,
    relationship_type character varying(50) DEFAULT 'direct_report'::character varying NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    department character varying(100),
    cost_center character varying(50),
    delegation_level integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_org_hierarchy OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5662 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE xa_org_hierarchy; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_org_hierarchy IS 'Org hierarchy table with validation information';


--
-- TOC entry 5663 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.id IS 'Org hierarchy ID';


--
-- TOC entry 5664 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5665 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.subordinate; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.subordinate IS 'User';


--
-- TOC entry 5666 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.supervisor; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.supervisor IS 'User';


--
-- TOC entry 5667 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.relationship_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.relationship_type IS 'Relationship type';


--
-- TOC entry 5668 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.effective_from; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.effective_from IS 'Effective from date';


--
-- TOC entry 5669 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.effective_to; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.effective_to IS 'Effective to date';


--
-- TOC entry 5670 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.department; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.department IS 'Department';


--
-- TOC entry 5671 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.cost_center; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.cost_center IS 'Cost center';


--
-- TOC entry 5672 (class 0 OID 0)
-- Dependencies: 247
-- Name: COLUMN xa_org_hierarchy.delegation_level; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_org_hierarchy.delegation_level IS 'Delegation level';


--
-- TOC entry 246 (class 1259 OID 42788)
-- Name: xa_org_hierarchy_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_org_hierarchy_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_org_hierarchy_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5673 (class 0 OID 0)
-- Dependencies: 246
-- Name: xa_org_hierarchy_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_org_hierarchy_id_seq OWNED BY public.xa_org_hierarchy.id;


--
-- TOC entry 277 (class 1259 OID 43408)
-- Name: xa_poste; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_poste (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    title character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    department integer NOT NULL,
    salary_base numeric(10,2),
    description text,
    level public.enum_xa_poste_level DEFAULT 'UNKNOWN'::public.enum_xa_poste_level NOT NULL,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_poste OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5674 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE xa_poste; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_poste IS 'Poste table with validation information';


--
-- TOC entry 5675 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.id IS 'Poste ID';


--
-- TOC entry 5676 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5677 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.title; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.title IS 'Poste title';


--
-- TOC entry 5678 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.code; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.code IS 'Poste code';


--
-- TOC entry 5679 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.department; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.department IS 'Department ID';


--
-- TOC entry 5680 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.salary_base; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.salary_base IS 'Salary base';


--
-- TOC entry 5681 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.description; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.description IS 'Poste description';


--
-- TOC entry 5682 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.level; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.level IS 'Poste level';


--
-- TOC entry 5683 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.active IS 'Poste status';


--
-- TOC entry 5684 (class 0 OID 0)
-- Dependencies: 277
-- Name: COLUMN xa_poste.deleted_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_poste.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 276 (class 1259 OID 43407)
-- Name: xa_poste_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_poste_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_poste_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5685 (class 0 OID 0)
-- Dependencies: 276
-- Name: xa_poste_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_poste_id_seq OWNED BY public.xa_poste.id;


--
-- TOC entry 257 (class 1259 OID 43012)
-- Name: xa_qr_code; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_qr_code (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    name character varying(100) NOT NULL,
    site integer NOT NULL,
    manager integer NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    shared boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_qr_code OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5686 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE xa_qr_code; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_qr_code IS 'QR Code Generation table for site access';


--
-- TOC entry 5687 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.id IS 'QR Code Generation ID';


--
-- TOC entry 5688 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5689 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.name IS 'QR Code name';


--
-- TOC entry 5690 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.site; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.site IS 'Site ID';


--
-- TOC entry 5691 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.manager; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.manager IS 'Manager who generated the QR code';


--
-- TOC entry 5692 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.valid_from; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.valid_from IS 'QR code validity start date (null = no start limit)';


--
-- TOC entry 5693 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.valid_to; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.valid_to IS 'QR code validity end date (null = no end limit)';


--
-- TOC entry 5694 (class 0 OID 0)
-- Dependencies: 257
-- Name: COLUMN xa_qr_code.shared; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_qr_code.shared IS 'Qr code is Shared';


--
-- TOC entry 256 (class 1259 OID 43011)
-- Name: xa_qr_code_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_qr_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_qr_code_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5695 (class 0 OID 0)
-- Dependencies: 256
-- Name: xa_qr_code_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_qr_code_id_seq OWNED BY public.xa_qr_code.id;


--
-- TOC entry 243 (class 1259 OID 42701)
-- Name: xa_roles; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_roles (
    id smallint NOT NULL,
    guid character varying(128) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    permissions jsonb NOT NULL,
    system_role boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_roles OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5696 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE xa_roles; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_roles IS 'Roles table with validation information';


--
-- TOC entry 5697 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.id IS 'Roles ID';


--
-- TOC entry 5698 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5699 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.code; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.code IS 'Unique role CODE';


--
-- TOC entry 5700 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.name IS 'Role NAME';


--
-- TOC entry 5701 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.description; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.description IS 'Role description';


--
-- TOC entry 5702 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.permissions; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.permissions IS 'Role permissions';


--
-- TOC entry 5703 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN xa_roles.system_role; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_roles.system_role IS 'System role';


--
-- TOC entry 242 (class 1259 OID 42700)
-- Name: xa_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_roles_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_roles_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5704 (class 0 OID 0)
-- Dependencies: 242
-- Name: xa_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_roles_id_seq OWNED BY public.xa_roles.id;


--
-- TOC entry 271 (class 1259 OID 43278)
-- Name: xa_rotation_assignments; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_rotation_assignments (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    "user" integer,
    groups integer,
    rotation_group integer NOT NULL,
    "offset" integer DEFAULT 0 NOT NULL,
    assigned_by integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    assigned_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_rotation_assignments OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5705 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE xa_rotation_assignments; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_rotation_assignments IS 'Rotation Assignments table linking users to rotation groups';


--
-- TOC entry 5706 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.id IS 'Rotation Assignment ID';


--
-- TOC entry 5707 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5708 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments."user"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments."user" IS 'Reference to user (nullable for groups rotation)';


--
-- TOC entry 5709 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.groups; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.groups IS 'Reference to groups (nullable for user rotation )';


--
-- TOC entry 5710 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.rotation_group; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.rotation_group IS 'Reference to rotation group to apply';


--
-- TOC entry 5711 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments."offset"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments."offset" IS 'Offset in the rotation cycle for this user';


--
-- TOC entry 5712 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.assigned_by; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.assigned_by IS 'User ID who assign the rotation';


--
-- TOC entry 5713 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.active IS 'Rotation status';


--
-- TOC entry 5714 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.assigned_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.assigned_at IS 'Date of assignment';


--
-- TOC entry 5715 (class 0 OID 0)
-- Dependencies: 271
-- Name: COLUMN xa_rotation_assignments.deleted_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_assignments.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 270 (class 1259 OID 43277)
-- Name: xa_rotation_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_rotation_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_rotation_assignments_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5716 (class 0 OID 0)
-- Dependencies: 270
-- Name: xa_rotation_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_rotation_assignments_id_seq OWNED BY public.xa_rotation_assignments.id;


--
-- TOC entry 269 (class 1259 OID 43260)
-- Name: xa_rotation_groups; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_rotation_groups (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    tenant character varying(128) NOT NULL,
    name character varying(255) NOT NULL,
    cycle_length integer NOT NULL,
    cycle_unit public.enum_xa_rotation_groups_cycle_unit NOT NULL,
    cycle_templates integer[] NOT NULL,
    start_date date NOT NULL,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_rotation_groups OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5717 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE xa_rotation_groups; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_rotation_groups IS 'Rotation Groups table for managing shift rotations';


--
-- TOC entry 5718 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.id IS 'Rotation Group ID';


--
-- TOC entry 5719 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5720 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.tenant; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.tenant IS 'Tenant Reference';


--
-- TOC entry 5721 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.name IS 'Rotation Group name';


--
-- TOC entry 5722 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.cycle_length; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.cycle_length IS 'Number of cycles in the rotation';


--
-- TOC entry 5723 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.cycle_unit; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.cycle_unit IS 'Unit of the cycle: day or week';


--
-- TOC entry 5724 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.cycle_templates; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.cycle_templates IS 'Ordered array of session_template IDs';


--
-- TOC entry 5725 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.start_date; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.start_date IS 'Start date of the rotation cycle';


--
-- TOC entry 5726 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.active IS 'Rotation Group status';


--
-- TOC entry 5727 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN xa_rotation_groups.deleted_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_rotation_groups.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 268 (class 1259 OID 43259)
-- Name: xa_rotation_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_rotation_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_rotation_groups_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5728 (class 0 OID 0)
-- Dependencies: 268
-- Name: xa_rotation_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_rotation_groups_id_seq OWNED BY public.xa_rotation_groups.id;


--
-- TOC entry 273 (class 1259 OID 43318)
-- Name: xa_schedule_assignments; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_schedule_assignments (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    tenant character varying(128) NOT NULL,
    "user" integer,
    groups integer,
    session_template integer NOT NULL,
    start_date date NOT NULL,
    end_date date,
    created_by integer NOT NULL,
    reason text,
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_schedule_assignments OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5729 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE xa_schedule_assignments; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_schedule_assignments IS 'Schedule Assignments table for temporary schedule overrides';


--
-- TOC entry 5730 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.id IS 'Schedule Assignments ID';


--
-- TOC entry 5731 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5732 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.tenant; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.tenant IS 'Tenant Reference';


--
-- TOC entry 5733 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments."user"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments."user" IS 'Reference to user (nullable for groups Assignments)';


--
-- TOC entry 5734 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.groups; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.groups IS 'Reference to groups (nullable for user Assignments)';


--
-- TOC entry 5735 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.session_template; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.session_template IS 'Reference to session template to apply';


--
-- TOC entry 5736 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.start_date; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.start_date IS 'Start date of the Assignments';


--
-- TOC entry 5737 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.end_date; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.end_date IS 'End date of the Assignments';


--
-- TOC entry 5738 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.created_by; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.created_by IS 'User ID who created the Assignments';


--
-- TOC entry 5739 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.reason; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.reason IS 'Reason for the exception Assignments';


--
-- TOC entry 5740 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.active IS 'Assignments status';


--
-- TOC entry 5741 (class 0 OID 0)
-- Dependencies: 273
-- Name: COLUMN xa_schedule_assignments.deleted_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_schedule_assignments.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 272 (class 1259 OID 43317)
-- Name: xa_schedule_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_schedule_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_schedule_assignments_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5742 (class 0 OID 0)
-- Dependencies: 272
-- Name: xa_schedule_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_schedule_assignments_id_seq OWNED BY public.xa_schedule_assignments.id;


--
-- TOC entry 267 (class 1259 OID 43232)
-- Name: xa_session_templates; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_session_templates (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    tenant character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone,
    definition jsonb NOT NULL,
    defaults boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.xa_session_templates OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5743 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE xa_session_templates; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_session_templates IS 'Session templates table with validation information';


--
-- TOC entry 5744 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.id IS 'User ID';


--
-- TOC entry 5745 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5746 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.tenant; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.tenant IS 'Tenant Reference';


--
-- TOC entry 5747 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.name IS 'Session name';


--
-- TOC entry 5748 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.valid_from; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.valid_from IS 'Session valid from date';


--
-- TOC entry 5749 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.valid_to; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.valid_to IS 'Session valid to date';


--
-- TOC entry 5750 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.definition; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.definition IS 'Session definition with day-based work blocks';


--
-- TOC entry 5751 (class 0 OID 0)
-- Dependencies: 267
-- Name: COLUMN xa_session_templates.defaults; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_session_templates.defaults IS 'Session default for the company';


--
-- TOC entry 266 (class 1259 OID 43231)
-- Name: xa_session_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_session_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_session_templates_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5752 (class 0 OID 0)
-- Dependencies: 266
-- Name: xa_session_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_session_templates_id_seq OWNED BY public.xa_session_templates.id;


--
-- TOC entry 249 (class 1259 OID 42830)
-- Name: xa_sites; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_sites (
    id integer NOT NULL,
    guid character varying(128) NOT NULL,
    tenant character varying(128) NOT NULL,
    created_by integer NOT NULL,
    name character varying(255) NOT NULL,
    site_type public.enum_xa_sites_site_type DEFAULT 'manager_site'::public.enum_xa_sites_site_type NOT NULL,
    address jsonb,
    geofence_polygon public.geometry(Polygon,4326) NOT NULL,
    geofence_radius integer DEFAULT 100 NOT NULL,
    qr_reference integer,
    qr_code_data jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    public boolean DEFAULT false NOT NULL,
    allowed_roles jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_sites OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5753 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE xa_sites; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_sites IS 'Sites table with validation information';


--
-- TOC entry 5754 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.id IS 'Site ID';


--
-- TOC entry 5755 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5756 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.tenant; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.tenant IS 'Tenant Reference ';


--
-- TOC entry 5757 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.created_by; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.created_by IS 'Users';


--
-- TOC entry 5758 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.name IS 'Site name';


--
-- TOC entry 5759 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.site_type; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.site_type IS 'Site type';


--
-- TOC entry 5760 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.address; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.address IS 'Sites address as JSON object with city, location, place_name';


--
-- TOC entry 5761 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.geofence_polygon; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.geofence_polygon IS 'Sites geofence polygon';


--
-- TOC entry 5762 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.geofence_radius; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.geofence_radius IS 'Sites geofence radius';


--
-- TOC entry 5763 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.qr_reference; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.qr_reference IS 'QR reference users';


--
-- TOC entry 5764 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.qr_code_data; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.qr_code_data IS 'QR code data as JSON object';


--
-- TOC entry 5765 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.active IS 'Site is active';


--
-- TOC entry 5766 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.public; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.public IS 'Site is public';


--
-- TOC entry 5767 (class 0 OID 0)
-- Dependencies: 249
-- Name: COLUMN xa_sites.allowed_roles; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_sites.allowed_roles IS 'Allowed roles as JSON object';


--
-- TOC entry 248 (class 1259 OID 42829)
-- Name: xa_sites_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_sites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_sites_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5768 (class 0 OID 0)
-- Dependencies: 248
-- Name: xa_sites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_sites_id_seq OWNED BY public.xa_sites.id;


--
-- TOC entry 245 (class 1259 OID 42759)
-- Name: xa_user_roles; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_user_roles (
    id smallint NOT NULL,
    guid character varying(128) NOT NULL,
    "user" integer NOT NULL,
    role smallint NOT NULL,
    assigned_by integer,
    assigned_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_user_roles OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5769 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE xa_user_roles; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_user_roles IS 'User roles table with validation information';


--
-- TOC entry 5770 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN xa_user_roles.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_user_roles.id IS 'User role ID';


--
-- TOC entry 5771 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN xa_user_roles.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_user_roles.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN xa_user_roles."user"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_user_roles."user" IS 'Users';


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN xa_user_roles.role; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_user_roles.role IS 'Roles';


--
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN xa_user_roles.assigned_by; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_user_roles.assigned_by IS 'Users';


--
-- TOC entry 244 (class 1259 OID 42758)
-- Name: xa_user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_user_roles_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_user_roles_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 244
-- Name: xa_user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_user_roles_id_seq OWNED BY public.xa_user_roles.id;


--
-- TOC entry 279 (class 1259 OID 43470)
-- Name: xa_users; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_users (
    id integer NOT NULL,
    guid character varying(255) NOT NULL,
    tenant character varying(128) NOT NULL,
    email character varying(255),
    first_name character varying(100),
    last_name character varying(100) NOT NULL,
    phone_number character varying(20),
    country character varying(2) NOT NULL,
    employee_code character varying(20),
    pin_hash character varying(255),
    password_hash character varying(255),
    otp_token character varying(10),
    otp_expires_at timestamp with time zone,
    qr_code_token character varying(255),
    qr_code_expires_at timestamp with time zone,
    avatar_url text,
    hire_date date,
    department character varying(100),
    job_title character varying(100),
    active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    last_login_at timestamp with time zone,
    device_token character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_users OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE xa_users; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_users IS 'User table with validation information';


--
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.id IS 'User ID';


--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5779 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.tenant; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.tenant IS 'Tenant Reference';


--
-- TOC entry 5780 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.email; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.email IS 'User email';


--
-- TOC entry 5781 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.first_name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.first_name IS 'User first name';


--
-- TOC entry 5782 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.last_name; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.last_name IS 'User last name';


--
-- TOC entry 5783 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.phone_number; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.phone_number IS 'User phone number';


--
-- TOC entry 5784 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.country; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.country IS 'ISO 3166-1 alpha-2 code (2 capital letters, e.g. CM)';


--
-- TOC entry 5785 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.employee_code; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.employee_code IS 'User employee code';


--
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.pin_hash; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.pin_hash IS 'User PIN hash';


--
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.password_hash; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.password_hash IS 'User password hash';


--
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.otp_token; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.otp_token IS 'User OTP token';


--
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.otp_expires_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.otp_expires_at IS 'User OTP expiration date';


--
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.qr_code_token; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.qr_code_token IS 'User QR code token';


--
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.qr_code_expires_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.qr_code_expires_at IS 'User QR code expiration date';


--
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.avatar_url; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.avatar_url IS 'User avatar URL';


--
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.hire_date; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.hire_date IS 'User hire date';


--
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.department; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.department IS 'User department';


--
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.job_title; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.job_title IS 'User job title';


--
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.active; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.active IS 'User status';


--
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.deleted_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.deleted_at IS 'Soft delete timestamp';


--
-- TOC entry 5798 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.last_login_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.last_login_at IS 'User last login date';


--
-- TOC entry 5799 (class 0 OID 0)
-- Dependencies: 279
-- Name: COLUMN xa_users.device_token; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_users.device_token IS 'User device token';


--
-- TOC entry 278 (class 1259 OID 43469)
-- Name: xa_users_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_users_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5800 (class 0 OID 0)
-- Dependencies: 278
-- Name: xa_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_users_id_seq OWNED BY public.xa_users.id;


--
-- TOC entry 251 (class 1259 OID 42878)
-- Name: xa_work_sessions; Type: TABLE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE TABLE public.xa_work_sessions (
    id smallint NOT NULL,
    guid character varying(128) NOT NULL,
    "user" integer NOT NULL,
    site integer NOT NULL,
    session_status public.enum_xa_work_sessions_session_status DEFAULT 'open'::public.enum_xa_work_sessions_session_status NOT NULL,
    session_start_at timestamp with time zone NOT NULL,
    session_end_at timestamp with time zone,
    total_work_duration character varying(255),
    total_pause_duration character varying(255),
    start_latitude numeric(10,8),
    start_longitude numeric(11,8),
    end_latitude numeric(10,8),
    end_longitude numeric(11,8),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.xa_work_sessions OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5801 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE xa_work_sessions; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON TABLE public.xa_work_sessions IS 'Work sessions table with validation information';


--
-- TOC entry 5802 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.id; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.id IS 'Work session ID';


--
-- TOC entry 5803 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.guid; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.guid IS 'Unique, automatically generated digital GUID';


--
-- TOC entry 5804 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions."user"; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions."user" IS 'Users';


--
-- TOC entry 5805 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.site; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.site IS 'Sites';


--
-- TOC entry 5806 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.session_status; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.session_status IS 'Session status';


--
-- TOC entry 5807 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.session_start_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.session_start_at IS 'Session start date';


--
-- TOC entry 5808 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.session_end_at; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.session_end_at IS 'Session end date';


--
-- TOC entry 5809 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.total_work_duration; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.total_work_duration IS 'Total work duration as PostgreSQL INTERVAL string';


--
-- TOC entry 5810 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.total_pause_duration; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.total_pause_duration IS 'Total pause duration as PostgreSQL INTERVAL string';


--
-- TOC entry 5811 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.start_latitude; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.start_latitude IS 'Start latitude';


--
-- TOC entry 5812 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.start_longitude; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.start_longitude IS 'Start longitude';


--
-- TOC entry 5813 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.end_latitude; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.end_latitude IS 'End latitude';


--
-- TOC entry 5814 (class 0 OID 0)
-- Dependencies: 251
-- Name: COLUMN xa_work_sessions.end_longitude; Type: COMMENT; Schema: public; Owner: imediatis_sarl_user_f04d
--

COMMENT ON COLUMN public.xa_work_sessions.end_longitude IS 'End longitude';


--
-- TOC entry 250 (class 1259 OID 42877)
-- Name: xa_work_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE SEQUENCE public.xa_work_sessions_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xa_work_sessions_id_seq OWNER TO imediatis_sarl_user_f04d;

--
-- TOC entry 5815 (class 0 OID 0)
-- Dependencies: 250
-- Name: xa_work_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER SEQUENCE public.xa_work_sessions_id_seq OWNED BY public.xa_work_sessions.id;


--
-- TOC entry 5044 (class 2604 OID 42941)
-- Name: tk_memos id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_memos ALTER COLUMN id SET DEFAULT nextval('public.tk_memos_id_seq'::regclass);


--
-- TOC entry 5053 (class 2604 OID 43109)
-- Name: tk_time_entries id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries ALTER COLUMN id SET DEFAULT nextval('public.tk_time_entries_id_seq'::regclass);


--
-- TOC entry 5057 (class 2604 OID 43176)
-- Name: xa_audit_logs id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.xa_audit_logs_id_seq'::regclass);


--
-- TOC entry 5071 (class 2604 OID 43366)
-- Name: xa_department id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_department ALTER COLUMN id SET DEFAULT nextval('public.xa_department_id_seq'::regclass);


--
-- TOC entry 5050 (class 2604 OID 43051)
-- Name: xa_device id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_device ALTER COLUMN id SET DEFAULT nextval('public.xa_device_id_seq'::regclass);


--
-- TOC entry 5058 (class 2604 OID 43200)
-- Name: xa_fraud_alerts id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_fraud_alerts ALTER COLUMN id SET DEFAULT nextval('public.xa_fraud_alerts_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 42991)
-- Name: xa_groups id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_groups ALTER COLUMN id SET DEFAULT nextval('public.xa_groups_id_seq'::regclass);


--
-- TOC entry 5034 (class 2604 OID 42792)
-- Name: xa_org_hierarchy id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_org_hierarchy ALTER COLUMN id SET DEFAULT nextval('public.xa_org_hierarchy_id_seq'::regclass);


--
-- TOC entry 5073 (class 2604 OID 43411)
-- Name: xa_poste id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_poste ALTER COLUMN id SET DEFAULT nextval('public.xa_poste_id_seq'::regclass);


--
-- TOC entry 5048 (class 2604 OID 43015)
-- Name: xa_qr_code id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_qr_code ALTER COLUMN id SET DEFAULT nextval('public.xa_qr_code_id_seq'::regclass);


--
-- TOC entry 5031 (class 2604 OID 42704)
-- Name: xa_roles id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_roles ALTER COLUMN id SET DEFAULT nextval('public.xa_roles_id_seq'::regclass);


--
-- TOC entry 5066 (class 2604 OID 43281)
-- Name: xa_rotation_assignments id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_assignments ALTER COLUMN id SET DEFAULT nextval('public.xa_rotation_assignments_id_seq'::regclass);


--
-- TOC entry 5064 (class 2604 OID 43263)
-- Name: xa_rotation_groups id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_groups ALTER COLUMN id SET DEFAULT nextval('public.xa_rotation_groups_id_seq'::regclass);


--
-- TOC entry 5069 (class 2604 OID 43321)
-- Name: xa_schedule_assignments id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_schedule_assignments ALTER COLUMN id SET DEFAULT nextval('public.xa_schedule_assignments_id_seq'::regclass);


--
-- TOC entry 5062 (class 2604 OID 43235)
-- Name: xa_session_templates id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_session_templates ALTER COLUMN id SET DEFAULT nextval('public.xa_session_templates_id_seq'::regclass);


--
-- TOC entry 5037 (class 2604 OID 42833)
-- Name: xa_sites id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_sites ALTER COLUMN id SET DEFAULT nextval('public.xa_sites_id_seq'::regclass);


--
-- TOC entry 5033 (class 2604 OID 42762)
-- Name: xa_user_roles id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_user_roles ALTER COLUMN id SET DEFAULT nextval('public.xa_user_roles_id_seq'::regclass);


--
-- TOC entry 5076 (class 2604 OID 43473)
-- Name: xa_users id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users ALTER COLUMN id SET DEFAULT nextval('public.xa_users_id_seq'::regclass);


--
-- TOC entry 5042 (class 2604 OID 42881)
-- Name: xa_work_sessions id; Type: DEFAULT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_work_sessions ALTER COLUMN id SET DEFAULT nextval('public.xa_work_sessions_id_seq'::regclass);


--
-- TOC entry 5180 (class 2606 OID 42948)
-- Name: tk_memos tk_memos_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_memos
    ADD CONSTRAINT tk_memos_guid_key UNIQUE (guid);


--
-- TOC entry 5182 (class 2606 OID 42946)
-- Name: tk_memos tk_memos_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_memos
    ADD CONSTRAINT tk_memos_pkey PRIMARY KEY (id);


--
-- TOC entry 5244 (class 2606 OID 43118)
-- Name: tk_time_entries tk_time_entries_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_guid_key UNIQUE (guid);


--
-- TOC entry 5246 (class 2606 OID 43116)
-- Name: tk_time_entries tk_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5261 (class 2606 OID 43182)
-- Name: xa_audit_logs xa_audit_logs_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_audit_logs
    ADD CONSTRAINT xa_audit_logs_guid_key UNIQUE (guid);


--
-- TOC entry 5263 (class 2606 OID 43180)
-- Name: xa_audit_logs xa_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_audit_logs
    ADD CONSTRAINT xa_audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5341 (class 2606 OID 43373)
-- Name: xa_department xa_department_guid_code_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_department
    ADD CONSTRAINT xa_department_guid_code_key UNIQUE (guid, code);


--
-- TOC entry 5343 (class 2606 OID 43371)
-- Name: xa_department xa_department_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_department
    ADD CONSTRAINT xa_department_pkey PRIMARY KEY (id);


--
-- TOC entry 5217 (class 2606 OID 43057)
-- Name: xa_device xa_device_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_device
    ADD CONSTRAINT xa_device_guid_key UNIQUE (guid);


--
-- TOC entry 5219 (class 2606 OID 43055)
-- Name: xa_device xa_device_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_device
    ADD CONSTRAINT xa_device_pkey PRIMARY KEY (id);


--
-- TOC entry 5276 (class 2606 OID 43209)
-- Name: xa_fraud_alerts xa_fraud_alerts_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_fraud_alerts
    ADD CONSTRAINT xa_fraud_alerts_guid_key UNIQUE (guid);


--
-- TOC entry 5278 (class 2606 OID 43207)
-- Name: xa_fraud_alerts xa_fraud_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_fraud_alerts
    ADD CONSTRAINT xa_fraud_alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 5191 (class 2606 OID 42998)
-- Name: xa_groups xa_groups_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_groups
    ADD CONSTRAINT xa_groups_guid_key UNIQUE (guid);


--
-- TOC entry 5193 (class 2606 OID 42996)
-- Name: xa_groups xa_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_groups
    ADD CONSTRAINT xa_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 2606 OID 42798)
-- Name: xa_org_hierarchy xa_org_hierarchy_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_org_hierarchy
    ADD CONSTRAINT xa_org_hierarchy_guid_key UNIQUE (guid);


--
-- TOC entry 5124 (class 2606 OID 42796)
-- Name: xa_org_hierarchy xa_org_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_org_hierarchy
    ADD CONSTRAINT xa_org_hierarchy_pkey PRIMARY KEY (id);


--
-- TOC entry 5353 (class 2606 OID 43419)
-- Name: xa_poste xa_poste_guid_code_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_poste
    ADD CONSTRAINT xa_poste_guid_code_key UNIQUE (guid, code);


--
-- TOC entry 5355 (class 2606 OID 43417)
-- Name: xa_poste xa_poste_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_poste
    ADD CONSTRAINT xa_poste_pkey PRIMARY KEY (id);


--
-- TOC entry 5204 (class 2606 OID 43020)
-- Name: xa_qr_code xa_qr_code_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_qr_code
    ADD CONSTRAINT xa_qr_code_guid_key UNIQUE (guid);


--
-- TOC entry 5206 (class 2606 OID 43018)
-- Name: xa_qr_code xa_qr_code_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_qr_code
    ADD CONSTRAINT xa_qr_code_pkey PRIMARY KEY (id);


--
-- TOC entry 5095 (class 2606 OID 42713)
-- Name: xa_roles xa_roles_code_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_roles
    ADD CONSTRAINT xa_roles_code_key UNIQUE (code);


--
-- TOC entry 5097 (class 2606 OID 42711)
-- Name: xa_roles xa_roles_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_roles
    ADD CONSTRAINT xa_roles_guid_key UNIQUE (guid);


--
-- TOC entry 5099 (class 2606 OID 42709)
-- Name: xa_roles xa_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_roles
    ADD CONSTRAINT xa_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5314 (class 2606 OID 43287)
-- Name: xa_rotation_assignments xa_rotation_assignments_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_assignments
    ADD CONSTRAINT xa_rotation_assignments_guid_key UNIQUE (guid);


--
-- TOC entry 5316 (class 2606 OID 43285)
-- Name: xa_rotation_assignments xa_rotation_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_assignments
    ADD CONSTRAINT xa_rotation_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5301 (class 2606 OID 43270)
-- Name: xa_rotation_groups xa_rotation_groups_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_groups
    ADD CONSTRAINT xa_rotation_groups_guid_key UNIQUE (guid);


--
-- TOC entry 5303 (class 2606 OID 43268)
-- Name: xa_rotation_groups xa_rotation_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_groups
    ADD CONSTRAINT xa_rotation_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5331 (class 2606 OID 43328)
-- Name: xa_schedule_assignments xa_schedule_assignments_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_schedule_assignments
    ADD CONSTRAINT xa_schedule_assignments_guid_key UNIQUE (guid);


--
-- TOC entry 5333 (class 2606 OID 43326)
-- Name: xa_schedule_assignments xa_schedule_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_schedule_assignments
    ADD CONSTRAINT xa_schedule_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5291 (class 2606 OID 43242)
-- Name: xa_session_templates xa_session_templates_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_session_templates
    ADD CONSTRAINT xa_session_templates_guid_key UNIQUE (guid);


--
-- TOC entry 5293 (class 2606 OID 43240)
-- Name: xa_session_templates xa_session_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_session_templates
    ADD CONSTRAINT xa_session_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5140 (class 2606 OID 42843)
-- Name: xa_sites xa_sites_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_sites
    ADD CONSTRAINT xa_sites_guid_key UNIQUE (guid);


--
-- TOC entry 5142 (class 2606 OID 42841)
-- Name: xa_sites xa_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_sites
    ADD CONSTRAINT xa_sites_pkey PRIMARY KEY (id);


--
-- TOC entry 5107 (class 2606 OID 42766)
-- Name: xa_user_roles xa_user_roles_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_user_roles
    ADD CONSTRAINT xa_user_roles_guid_key UNIQUE (guid);


--
-- TOC entry 5109 (class 2606 OID 42764)
-- Name: xa_user_roles xa_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_user_roles
    ADD CONSTRAINT xa_user_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5374 (class 2606 OID 43482)
-- Name: xa_users xa_users_email_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_email_key UNIQUE (email);


--
-- TOC entry 5376 (class 2606 OID 43486)
-- Name: xa_users xa_users_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_employee_code_key UNIQUE (employee_code);


--
-- TOC entry 5378 (class 2606 OID 43480)
-- Name: xa_users xa_users_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_guid_key UNIQUE (guid);


--
-- TOC entry 5380 (class 2606 OID 43488)
-- Name: xa_users xa_users_otp_token_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_otp_token_key UNIQUE (otp_token);


--
-- TOC entry 5382 (class 2606 OID 43484)
-- Name: xa_users xa_users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_phone_number_key UNIQUE (phone_number);


--
-- TOC entry 5384 (class 2606 OID 43478)
-- Name: xa_users xa_users_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_pkey PRIMARY KEY (id);


--
-- TOC entry 5386 (class 2606 OID 43490)
-- Name: xa_users xa_users_qr_code_token_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_users
    ADD CONSTRAINT xa_users_qr_code_token_key UNIQUE (qr_code_token);


--
-- TOC entry 5158 (class 2606 OID 42888)
-- Name: xa_work_sessions xa_work_sessions_guid_key; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_work_sessions
    ADD CONSTRAINT xa_work_sessions_guid_key UNIQUE (guid);


--
-- TOC entry 5160 (class 2606 OID 42886)
-- Name: xa_work_sessions xa_work_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_work_sessions
    ADD CONSTRAINT xa_work_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5247 (class 1259 OID 43192)
-- Name: idx_audit_log_change_reason; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_change_reason ON public.xa_audit_logs USING btree (change_reason);


--
-- TOC entry 5248 (class 1259 OID 43191)
-- Name: idx_audit_log_changed_by_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_changed_by_type ON public.xa_audit_logs USING btree (changed_by_type);


--
-- TOC entry 5249 (class 1259 OID 43190)
-- Name: idx_audit_log_changed_by_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_changed_by_user ON public.xa_audit_logs USING btree (changed_by_user);


--
-- TOC entry 5250 (class 1259 OID 43195)
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_created_at ON public.xa_audit_logs USING btree (created_at);


--
-- TOC entry 5251 (class 1259 OID 43183)
-- Name: idx_audit_log_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_guid ON public.xa_audit_logs USING btree (guid);


--
-- TOC entry 5252 (class 1259 OID 43193)
-- Name: idx_audit_log_ip_address; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_ip_address ON public.xa_audit_logs USING btree (ip_address);


--
-- TOC entry 5253 (class 1259 OID 43189)
-- Name: idx_audit_log_new_values; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_new_values ON public.xa_audit_logs USING btree (new_values);


--
-- TOC entry 5254 (class 1259 OID 43188)
-- Name: idx_audit_log_old_values; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_old_values ON public.xa_audit_logs USING btree (old_values);


--
-- TOC entry 5255 (class 1259 OID 43187)
-- Name: idx_audit_log_operation; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_operation ON public.xa_audit_logs USING btree (operation);


--
-- TOC entry 5256 (class 1259 OID 43185)
-- Name: idx_audit_log_record; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_record ON public.xa_audit_logs USING btree (record);


--
-- TOC entry 5257 (class 1259 OID 43186)
-- Name: idx_audit_log_record_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_record_guid ON public.xa_audit_logs USING btree (record_guid);


--
-- TOC entry 5258 (class 1259 OID 43184)
-- Name: idx_audit_log_table_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_table_name ON public.xa_audit_logs USING btree (table_name);


--
-- TOC entry 5259 (class 1259 OID 43194)
-- Name: idx_audit_log_user_agent; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_audit_log_user_agent ON public.xa_audit_logs USING btree (user_agent);


--
-- TOC entry 5334 (class 1259 OID 43382)
-- Name: idx_department_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_department_active ON public.xa_department USING btree (active);


--
-- TOC entry 5335 (class 1259 OID 43381)
-- Name: idx_department_code; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_department_code ON public.xa_department USING btree (code);


--
-- TOC entry 5336 (class 1259 OID 43384)
-- Name: idx_department_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_department_deleted_at ON public.xa_department USING btree (deleted_at);


--
-- TOC entry 5337 (class 1259 OID 43379)
-- Name: idx_department_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_department_guid ON public.xa_department USING btree (guid);


--
-- TOC entry 5338 (class 1259 OID 43383)
-- Name: idx_department_manager; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_department_manager ON public.xa_department USING btree (manager);


--
-- TOC entry 5339 (class 1259 OID 43380)
-- Name: idx_department_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_department_name ON public.xa_department USING btree (name);


--
-- TOC entry 5207 (class 1259 OID 43075)
-- Name: idx_device_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_active ON public.xa_device USING btree (active);


--
-- TOC entry 5208 (class 1259 OID 43071)
-- Name: idx_device_assigned_to; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_assigned_to ON public.xa_device USING btree (assigned_to);


--
-- TOC entry 5209 (class 1259 OID 43076)
-- Name: idx_device_config_by; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_config_by ON public.xa_device USING btree (config_by);


--
-- TOC entry 5210 (class 1259 OID 43074)
-- Name: idx_device_custom_geofence_radius; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_custom_geofence_radius ON public.xa_device USING btree (custom_geofence_radius);


--
-- TOC entry 5211 (class 1259 OID 43073)
-- Name: idx_device_gps_accuracy; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_gps_accuracy ON public.xa_device USING btree (gps_accuracy);


--
-- TOC entry 5212 (class 1259 OID 43068)
-- Name: idx_device_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_guid ON public.xa_device USING btree (guid);


--
-- TOC entry 5213 (class 1259 OID 43072)
-- Name: idx_device_last_seen_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_last_seen_at ON public.xa_device USING btree (last_seen_at);


--
-- TOC entry 5214 (class 1259 OID 43069)
-- Name: idx_device_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_name ON public.xa_device USING btree (name);


--
-- TOC entry 5215 (class 1259 OID 43070)
-- Name: idx_device_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_device_type ON public.xa_device USING btree (device_type);


--
-- TOC entry 5264 (class 1259 OID 43226)
-- Name: idx_fraud_alerts_alert_data; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_alert_data ON public.xa_fraud_alerts USING gin (alert_data);


--
-- TOC entry 5265 (class 1259 OID 43225)
-- Name: idx_fraud_alerts_alert_description; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_alert_description ON public.xa_fraud_alerts USING btree (alert_description);


--
-- TOC entry 5266 (class 1259 OID 43224)
-- Name: idx_fraud_alerts_alert_severity; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_alert_severity ON public.xa_fraud_alerts USING btree (alert_severity);


--
-- TOC entry 5267 (class 1259 OID 43223)
-- Name: idx_fraud_alerts_alert_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_alert_type ON public.xa_fraud_alerts USING btree (alert_type);


--
-- TOC entry 5268 (class 1259 OID 43229)
-- Name: idx_fraud_alerts_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_created_at ON public.xa_fraud_alerts USING btree (created_at);


--
-- TOC entry 5269 (class 1259 OID 43228)
-- Name: idx_fraud_alerts_false_positive; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_false_positive ON public.xa_fraud_alerts USING btree (false_positive);


--
-- TOC entry 5270 (class 1259 OID 43220)
-- Name: idx_fraud_alerts_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_guid ON public.xa_fraud_alerts USING btree (guid);


--
-- TOC entry 5271 (class 1259 OID 43227)
-- Name: idx_fraud_alerts_investigated; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_investigated ON public.xa_fraud_alerts USING btree (investigated);


--
-- TOC entry 5272 (class 1259 OID 43230)
-- Name: idx_fraud_alerts_investigated_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_investigated_at ON public.xa_fraud_alerts USING btree (investigated_at);


--
-- TOC entry 5273 (class 1259 OID 43222)
-- Name: idx_fraud_alerts_time_entry; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_time_entry ON public.xa_fraud_alerts USING btree (time_entry);


--
-- TOC entry 5274 (class 1259 OID 43221)
-- Name: idx_fraud_alerts_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_fraud_alerts_user ON public.xa_fraud_alerts USING btree ("user");


--
-- TOC entry 5183 (class 1259 OID 43007)
-- Name: idx_groups_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_groups_created_at ON public.xa_groups USING btree (created_at);


--
-- TOC entry 5184 (class 1259 OID 43008)
-- Name: idx_groups_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_groups_deleted_at ON public.xa_groups USING btree (deleted_at);


--
-- TOC entry 5185 (class 1259 OID 43004)
-- Name: idx_groups_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_groups_guid ON public.xa_groups USING btree (guid);


--
-- TOC entry 5186 (class 1259 OID 43006)
-- Name: idx_groups_manager; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_groups_manager ON public.xa_groups USING btree (manager);


--
-- TOC entry 5187 (class 1259 OID 43010)
-- Name: idx_groups_manager_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX idx_groups_manager_name ON public.xa_groups USING btree (manager, name);


--
-- TOC entry 5188 (class 1259 OID 43009)
-- Name: idx_groups_members; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_groups_members ON public.xa_groups USING gin (members);


--
-- TOC entry 5189 (class 1259 OID 43005)
-- Name: idx_groups_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_groups_name ON public.xa_groups USING btree (name);


--
-- TOC entry 5161 (class 1259 OID 42978)
-- Name: idx_memo_affected_entries; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_affected_entries ON public.tk_memos USING btree (affected_entries);


--
-- TOC entry 5162 (class 1259 OID 42977)
-- Name: idx_memo_affected_session; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_affected_session ON public.tk_memos USING btree (affected_session);


--
-- TOC entry 5163 (class 1259 OID 42985)
-- Name: idx_memo_author_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_author_type ON public.tk_memos USING btree (author_user, memo_type);


--
-- TOC entry 5164 (class 1259 OID 42970)
-- Name: idx_memo_author_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_author_user ON public.tk_memos USING btree (author_user);


--
-- TOC entry 5165 (class 1259 OID 42979)
-- Name: idx_memo_auto_generated; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_auto_generated ON public.tk_memos USING btree (auto_generated);


--
-- TOC entry 5166 (class 1259 OID 42986)
-- Name: idx_memo_content; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_content ON public.tk_memos USING btree (memo_content);


--
-- TOC entry 5167 (class 1259 OID 42981)
-- Name: idx_memo_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_created_at ON public.tk_memos USING btree (created_at);


--
-- TOC entry 5168 (class 1259 OID 42980)
-- Name: idx_memo_details; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_details ON public.tk_memos USING btree (details);


--
-- TOC entry 5169 (class 1259 OID 42969)
-- Name: idx_memo_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_guid ON public.tk_memos USING btree (guid);


--
-- TOC entry 5170 (class 1259 OID 42976)
-- Name: idx_memo_incident_datetime; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_incident_datetime ON public.tk_memos USING btree (incident_datetime);


--
-- TOC entry 5171 (class 1259 OID 42974)
-- Name: idx_memo_memo_status; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_memo_status ON public.tk_memos USING btree (memo_status);


--
-- TOC entry 5172 (class 1259 OID 42973)
-- Name: idx_memo_memo_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_memo_type ON public.tk_memos USING btree (memo_type);


--
-- TOC entry 5173 (class 1259 OID 42984)
-- Name: idx_memo_target_status; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_target_status ON public.tk_memos USING btree (target_user, memo_status);


--
-- TOC entry 5174 (class 1259 OID 42971)
-- Name: idx_memo_target_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_target_user ON public.tk_memos USING btree (target_user);


--
-- TOC entry 5175 (class 1259 OID 42975)
-- Name: idx_memo_title; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_title ON public.tk_memos USING btree (title);


--
-- TOC entry 5176 (class 1259 OID 42983)
-- Name: idx_memo_type_status; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_type_status ON public.tk_memos USING btree (memo_type, memo_status);


--
-- TOC entry 5177 (class 1259 OID 42982)
-- Name: idx_memo_updated_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_updated_at ON public.tk_memos USING btree (updated_at);


--
-- TOC entry 5178 (class 1259 OID 42972)
-- Name: idx_memo_validator_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_memo_validator_user ON public.tk_memos USING btree (validator_user);


--
-- TOC entry 5110 (class 1259 OID 42817)
-- Name: idx_org_hierarchy_cost_center; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_cost_center ON public.xa_org_hierarchy USING btree (cost_center);


--
-- TOC entry 5111 (class 1259 OID 42819)
-- Name: idx_org_hierarchy_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_created_at ON public.xa_org_hierarchy USING btree (created_at);


--
-- TOC entry 5112 (class 1259 OID 42818)
-- Name: idx_org_hierarchy_delegation_level; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_delegation_level ON public.xa_org_hierarchy USING btree (delegation_level);


--
-- TOC entry 5113 (class 1259 OID 42816)
-- Name: idx_org_hierarchy_department; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_department ON public.xa_org_hierarchy USING btree (department);


--
-- TOC entry 5114 (class 1259 OID 42812)
-- Name: idx_org_hierarchy_effective_from; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_effective_from ON public.xa_org_hierarchy USING btree (effective_from);


--
-- TOC entry 5115 (class 1259 OID 42815)
-- Name: idx_org_hierarchy_effective_to; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_effective_to ON public.xa_org_hierarchy USING btree (effective_to);


--
-- TOC entry 5116 (class 1259 OID 42809)
-- Name: idx_org_hierarchy_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_guid ON public.xa_org_hierarchy USING btree (guid);


--
-- TOC entry 5117 (class 1259 OID 42814)
-- Name: idx_org_hierarchy_relationship_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_relationship_type ON public.xa_org_hierarchy USING btree (relationship_type);


--
-- TOC entry 5118 (class 1259 OID 42810)
-- Name: idx_org_hierarchy_subordinate; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_subordinate ON public.xa_org_hierarchy USING btree (subordinate);


--
-- TOC entry 5119 (class 1259 OID 42813)
-- Name: idx_org_hierarchy_subordinate_supervisor_effective_from; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX idx_org_hierarchy_subordinate_supervisor_effective_from ON public.xa_org_hierarchy USING btree (subordinate, supervisor, effective_from);


--
-- TOC entry 5120 (class 1259 OID 42811)
-- Name: idx_org_hierarchy_supervisor; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_org_hierarchy_supervisor ON public.xa_org_hierarchy USING btree (supervisor);


--
-- TOC entry 5344 (class 1259 OID 43430)
-- Name: idx_poste_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_active ON public.xa_poste USING btree (active);


--
-- TOC entry 5345 (class 1259 OID 43427)
-- Name: idx_poste_code; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_code ON public.xa_poste USING btree (code);


--
-- TOC entry 5346 (class 1259 OID 43432)
-- Name: idx_poste_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_deleted_at ON public.xa_poste USING btree (deleted_at);


--
-- TOC entry 5347 (class 1259 OID 43428)
-- Name: idx_poste_department; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_department ON public.xa_poste USING btree (department);


--
-- TOC entry 5348 (class 1259 OID 43425)
-- Name: idx_poste_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_guid ON public.xa_poste USING btree (guid);


--
-- TOC entry 5349 (class 1259 OID 43431)
-- Name: idx_poste_level; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_level ON public.xa_poste USING btree (level);


--
-- TOC entry 5350 (class 1259 OID 43429)
-- Name: idx_poste_salary_base; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_salary_base ON public.xa_poste USING btree (salary_base);


--
-- TOC entry 5351 (class 1259 OID 43426)
-- Name: idx_poste_title; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_poste_title ON public.xa_poste USING btree (title);


--
-- TOC entry 5194 (class 1259 OID 43036)
-- Name: idx_qr_code_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_created_at ON public.xa_qr_code USING btree (created_at);


--
-- TOC entry 5195 (class 1259 OID 43031)
-- Name: idx_qr_code_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX idx_qr_code_guid ON public.xa_qr_code USING btree (guid);


--
-- TOC entry 5196 (class 1259 OID 43033)
-- Name: idx_qr_code_manager; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_manager ON public.xa_qr_code USING btree (manager);


--
-- TOC entry 5197 (class 1259 OID 43039)
-- Name: idx_qr_code_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_name ON public.xa_qr_code USING btree (name);


--
-- TOC entry 5198 (class 1259 OID 43038)
-- Name: idx_qr_code_shared; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_shared ON public.xa_qr_code USING btree (shared);


--
-- TOC entry 5199 (class 1259 OID 43032)
-- Name: idx_qr_code_site; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_site ON public.xa_qr_code USING btree (site);


--
-- TOC entry 5200 (class 1259 OID 43037)
-- Name: idx_qr_code_site_manager; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_site_manager ON public.xa_qr_code USING btree (site, manager);


--
-- TOC entry 5201 (class 1259 OID 43034)
-- Name: idx_qr_code_valid_from; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_valid_from ON public.xa_qr_code USING btree (valid_from);


--
-- TOC entry 5202 (class 1259 OID 43035)
-- Name: idx_qr_code_valid_to; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_qr_code_valid_to ON public.xa_qr_code USING btree (valid_to);


--
-- TOC entry 5089 (class 1259 OID 42715)
-- Name: idx_role_code; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_role_code ON public.xa_roles USING btree (code);


--
-- TOC entry 5090 (class 1259 OID 42714)
-- Name: idx_role_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_role_guid ON public.xa_roles USING btree (guid);


--
-- TOC entry 5091 (class 1259 OID 42716)
-- Name: idx_role_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_role_name ON public.xa_roles USING btree (name);


--
-- TOC entry 5092 (class 1259 OID 42717)
-- Name: idx_role_permissions; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_role_permissions ON public.xa_roles USING gin (permissions);


--
-- TOC entry 5093 (class 1259 OID 42718)
-- Name: idx_role_system_role; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_role_system_role ON public.xa_roles USING btree (system_role);


--
-- TOC entry 5304 (class 1259 OID 43312)
-- Name: idx_rotation_assignments_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_active ON public.xa_rotation_assignments USING btree (active);


--
-- TOC entry 5305 (class 1259 OID 43313)
-- Name: idx_rotation_assignments_assigned_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_assigned_at ON public.xa_rotation_assignments USING btree (assigned_at);


--
-- TOC entry 5306 (class 1259 OID 43311)
-- Name: idx_rotation_assignments_assigned_by; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_assigned_by ON public.xa_rotation_assignments USING btree (assigned_by);


--
-- TOC entry 5307 (class 1259 OID 43314)
-- Name: idx_rotation_assignments_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_deleted_at ON public.xa_rotation_assignments USING btree (deleted_at);


--
-- TOC entry 5308 (class 1259 OID 43308)
-- Name: idx_rotation_assignments_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_guid ON public.xa_rotation_assignments USING btree (guid);


--
-- TOC entry 5309 (class 1259 OID 43310)
-- Name: idx_rotation_assignments_rotation_group; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_rotation_group ON public.xa_rotation_assignments USING btree (rotation_group);


--
-- TOC entry 5310 (class 1259 OID 43309)
-- Name: idx_rotation_assignments_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_assignments_user ON public.xa_rotation_assignments USING btree ("user");


--
-- TOC entry 5294 (class 1259 OID 43275)
-- Name: idx_rotation_groups_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_groups_active ON public.xa_rotation_groups USING btree (active);


--
-- TOC entry 5295 (class 1259 OID 43276)
-- Name: idx_rotation_groups_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_groups_deleted_at ON public.xa_rotation_groups USING btree (deleted_at);


--
-- TOC entry 5296 (class 1259 OID 43271)
-- Name: idx_rotation_groups_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_groups_guid ON public.xa_rotation_groups USING btree (guid);


--
-- TOC entry 5297 (class 1259 OID 43273)
-- Name: idx_rotation_groups_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_groups_name ON public.xa_rotation_groups USING btree (name);


--
-- TOC entry 5298 (class 1259 OID 43274)
-- Name: idx_rotation_groups_start_date; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_groups_start_date ON public.xa_rotation_groups USING btree (start_date);


--
-- TOC entry 5299 (class 1259 OID 43272)
-- Name: idx_rotation_groups_tenant; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_rotation_groups_tenant ON public.xa_rotation_groups USING btree (tenant);


--
-- TOC entry 5317 (class 1259 OID 43357)
-- Name: idx_schedule_assignments_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_active ON public.xa_schedule_assignments USING btree (active);


--
-- TOC entry 5318 (class 1259 OID 43356)
-- Name: idx_schedule_assignments_created_by; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_created_by ON public.xa_schedule_assignments USING btree (created_by);


--
-- TOC entry 5319 (class 1259 OID 43359)
-- Name: idx_schedule_assignments_date_range; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_date_range ON public.xa_schedule_assignments USING btree (start_date, end_date);


--
-- TOC entry 5320 (class 1259 OID 43358)
-- Name: idx_schedule_assignments_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_deleted_at ON public.xa_schedule_assignments USING btree (deleted_at);


--
-- TOC entry 5321 (class 1259 OID 43355)
-- Name: idx_schedule_assignments_end_date; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_end_date ON public.xa_schedule_assignments USING btree (end_date);


--
-- TOC entry 5322 (class 1259 OID 43352)
-- Name: idx_schedule_assignments_groups; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_groups ON public.xa_schedule_assignments USING btree (groups);


--
-- TOC entry 5323 (class 1259 OID 43349)
-- Name: idx_schedule_assignments_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_guid ON public.xa_schedule_assignments USING btree (guid);


--
-- TOC entry 5324 (class 1259 OID 43353)
-- Name: idx_schedule_assignments_session_template; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_session_template ON public.xa_schedule_assignments USING btree (session_template);


--
-- TOC entry 5325 (class 1259 OID 43354)
-- Name: idx_schedule_assignments_start_date; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_start_date ON public.xa_schedule_assignments USING btree (start_date);


--
-- TOC entry 5326 (class 1259 OID 43350)
-- Name: idx_schedule_assignments_tenant; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_tenant ON public.xa_schedule_assignments USING btree (tenant);


--
-- TOC entry 5327 (class 1259 OID 43351)
-- Name: idx_schedule_assignments_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_schedule_assignments_user ON public.xa_schedule_assignments USING btree ("user");


--
-- TOC entry 5279 (class 1259 OID 43248)
-- Name: idx_session_templates_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_created_at ON public.xa_session_templates USING btree (created_at);


--
-- TOC entry 5280 (class 1259 OID 43252)
-- Name: idx_session_templates_defaults; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_defaults ON public.xa_session_templates USING btree (defaults);


--
-- TOC entry 5281 (class 1259 OID 43250)
-- Name: idx_session_templates_definition; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_definition ON public.xa_session_templates USING gin (definition);


--
-- TOC entry 5282 (class 1259 OID 43253)
-- Name: idx_session_templates_definition_valid_to; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_definition_valid_to ON public.xa_session_templates USING btree (definition, valid_to);


--
-- TOC entry 5283 (class 1259 OID 43249)
-- Name: idx_session_templates_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_deleted_at ON public.xa_session_templates USING btree (deleted_at);


--
-- TOC entry 5284 (class 1259 OID 43243)
-- Name: idx_session_templates_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_guid ON public.xa_session_templates USING btree (guid);


--
-- TOC entry 5285 (class 1259 OID 43245)
-- Name: idx_session_templates_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_name ON public.xa_session_templates USING btree (name);


--
-- TOC entry 5286 (class 1259 OID 43244)
-- Name: idx_session_templates_tenant; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_tenant ON public.xa_session_templates USING btree (tenant);


--
-- TOC entry 5287 (class 1259 OID 43246)
-- Name: idx_session_templates_valid_from; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_valid_from ON public.xa_session_templates USING btree (valid_from);


--
-- TOC entry 5288 (class 1259 OID 43247)
-- Name: idx_session_templates_valid_to; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_session_templates_valid_to ON public.xa_session_templates USING btree (valid_to);


--
-- TOC entry 5125 (class 1259 OID 42864)
-- Name: idx_site_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_active ON public.xa_sites USING btree (active);


--
-- TOC entry 5126 (class 1259 OID 42859)
-- Name: idx_site_address; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_address ON public.xa_sites USING btree (address);


--
-- TOC entry 5127 (class 1259 OID 42866)
-- Name: idx_site_allowed_roles; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_allowed_roles ON public.xa_sites USING gin (allowed_roles);


--
-- TOC entry 5128 (class 1259 OID 42867)
-- Name: idx_site_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_created_at ON public.xa_sites USING btree (created_at);


--
-- TOC entry 5129 (class 1259 OID 42856)
-- Name: idx_site_created_by; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_created_by ON public.xa_sites USING btree (created_by);


--
-- TOC entry 5130 (class 1259 OID 42860)
-- Name: idx_site_geofence_polygon; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_geofence_polygon ON public.xa_sites USING gist (geofence_polygon);


--
-- TOC entry 5131 (class 1259 OID 42861)
-- Name: idx_site_geofence_radius; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_geofence_radius ON public.xa_sites USING btree (geofence_radius);


--
-- TOC entry 5132 (class 1259 OID 42854)
-- Name: idx_site_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_guid ON public.xa_sites USING btree (guid);


--
-- TOC entry 5133 (class 1259 OID 42857)
-- Name: idx_site_name; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_name ON public.xa_sites USING btree (name);


--
-- TOC entry 5134 (class 1259 OID 42865)
-- Name: idx_site_public; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_public ON public.xa_sites USING btree (public);


--
-- TOC entry 5135 (class 1259 OID 42863)
-- Name: idx_site_qr_code_data; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_qr_code_data ON public.xa_sites USING btree (qr_code_data);


--
-- TOC entry 5136 (class 1259 OID 42862)
-- Name: idx_site_qr_reference; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_qr_reference ON public.xa_sites USING btree (qr_reference);


--
-- TOC entry 5137 (class 1259 OID 42855)
-- Name: idx_site_tenant; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_tenant ON public.xa_sites USING btree (tenant);


--
-- TOC entry 5138 (class 1259 OID 42858)
-- Name: idx_site_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_site_type ON public.xa_sites USING btree (site_type);


--
-- TOC entry 5220 (class 1259 OID 43156)
-- Name: idx_time_entry_clocked_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_clocked_at ON public.tk_time_entries USING btree (clocked_at);


--
-- TOC entry 5221 (class 1259 OID 43171)
-- Name: idx_time_entry_correction_reason; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_correction_reason ON public.tk_time_entries USING btree (correction_reason);


--
-- TOC entry 5222 (class 1259 OID 43165)
-- Name: idx_time_entry_created_offline; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_created_offline ON public.tk_time_entries USING btree (created_offline);


--
-- TOC entry 5223 (class 1259 OID 43152)
-- Name: idx_time_entry_device; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_device ON public.tk_time_entries USING btree (device);


--
-- TOC entry 5224 (class 1259 OID 43162)
-- Name: idx_time_entry_device_info; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_device_info ON public.tk_time_entries USING btree (device_info);


--
-- TOC entry 5225 (class 1259 OID 43161)
-- Name: idx_time_entry_gps_accuracy; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_gps_accuracy ON public.tk_time_entries USING btree (gps_accuracy);


--
-- TOC entry 5226 (class 1259 OID 43149)
-- Name: idx_time_entry_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_guid ON public.tk_time_entries USING btree (guid);


--
-- TOC entry 5227 (class 1259 OID 43163)
-- Name: idx_time_entry_ip_address; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_ip_address ON public.tk_time_entries USING btree (ip_address);


--
-- TOC entry 5228 (class 1259 OID 43168)
-- Name: idx_time_entry_last_sync_attempt; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_last_sync_attempt ON public.tk_time_entries USING btree (last_sync_attempt);


--
-- TOC entry 5229 (class 1259 OID 43159)
-- Name: idx_time_entry_latitude; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_latitude ON public.tk_time_entries USING btree (latitude);


--
-- TOC entry 5230 (class 1259 OID 43166)
-- Name: idx_time_entry_local_id; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_local_id ON public.tk_time_entries USING btree (local_id);


--
-- TOC entry 5231 (class 1259 OID 43160)
-- Name: idx_time_entry_longitude; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_longitude ON public.tk_time_entries USING btree (longitude);


--
-- TOC entry 5232 (class 1259 OID 43169)
-- Name: idx_time_entry_memo; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_memo ON public.tk_time_entries USING btree (memo);


--
-- TOC entry 5233 (class 1259 OID 43155)
-- Name: idx_time_entry_pointage_status; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_pointage_status ON public.tk_time_entries USING btree (pointage_status);


--
-- TOC entry 5234 (class 1259 OID 43154)
-- Name: idx_time_entry_pointage_type; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_pointage_type ON public.tk_time_entries USING btree (pointage_type);


--
-- TOC entry 5235 (class 1259 OID 43170)
-- Name: idx_time_entry_qr_code; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_qr_code ON public.tk_time_entries USING btree (qr_code);


--
-- TOC entry 5236 (class 1259 OID 43157)
-- Name: idx_time_entry_real_clocked_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_real_clocked_at ON public.tk_time_entries USING btree (real_clocked_at);


--
-- TOC entry 5237 (class 1259 OID 43158)
-- Name: idx_time_entry_server_received_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_server_received_at ON public.tk_time_entries USING btree (server_received_at);


--
-- TOC entry 5238 (class 1259 OID 43150)
-- Name: idx_time_entry_session; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_session ON public.tk_time_entries USING btree (session);


--
-- TOC entry 5239 (class 1259 OID 43153)
-- Name: idx_time_entry_site; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_site ON public.tk_time_entries USING btree (site);


--
-- TOC entry 5240 (class 1259 OID 43167)
-- Name: idx_time_entry_sync_attempts; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_sync_attempts ON public.tk_time_entries USING btree (sync_attempts);


--
-- TOC entry 5241 (class 1259 OID 43151)
-- Name: idx_time_entry_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_user ON public.tk_time_entries USING btree ("user");


--
-- TOC entry 5242 (class 1259 OID 43164)
-- Name: idx_time_entry_user_agent; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_time_entry_user_agent ON public.tk_time_entries USING btree (user_agent);


--
-- TOC entry 5289 (class 1259 OID 43251)
-- Name: idx_unique_defaults_template; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX idx_unique_defaults_template ON public.xa_session_templates USING btree (id) WHERE ((defaults = true) AND (deleted_at IS NULL));


--
-- TOC entry 5356 (class 1259 OID 43503)
-- Name: idx_user_active; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_active ON public.xa_users USING btree (active);


--
-- TOC entry 5357 (class 1259 OID 43506)
-- Name: idx_user_country; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_country ON public.xa_users USING btree (country);


--
-- TOC entry 5358 (class 1259 OID 43504)
-- Name: idx_user_deleted_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_deleted_at ON public.xa_users USING btree (deleted_at);


--
-- TOC entry 5359 (class 1259 OID 43501)
-- Name: idx_user_department; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_department ON public.xa_users USING btree (department);


--
-- TOC entry 5360 (class 1259 OID 43507)
-- Name: idx_user_device_token; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_device_token ON public.xa_users USING btree (device_token);


--
-- TOC entry 5361 (class 1259 OID 43493)
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_email ON public.xa_users USING btree (email);


--
-- TOC entry 5362 (class 1259 OID 43495)
-- Name: idx_user_employee_code; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_employee_code ON public.xa_users USING btree (employee_code);


--
-- TOC entry 5363 (class 1259 OID 43491)
-- Name: idx_user_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_guid ON public.xa_users USING btree (guid);


--
-- TOC entry 5364 (class 1259 OID 43500)
-- Name: idx_user_hire_date; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_hire_date ON public.xa_users USING btree (hire_date);


--
-- TOC entry 5365 (class 1259 OID 43502)
-- Name: idx_user_job_title; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_job_title ON public.xa_users USING btree (job_title);


--
-- TOC entry 5366 (class 1259 OID 43505)
-- Name: idx_user_last_login_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_last_login_at ON public.xa_users USING btree (last_login_at);


--
-- TOC entry 5367 (class 1259 OID 43497)
-- Name: idx_user_otp_expires_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_otp_expires_at ON public.xa_users USING btree (otp_expires_at);


--
-- TOC entry 5368 (class 1259 OID 43496)
-- Name: idx_user_otp_token; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_otp_token ON public.xa_users USING btree (otp_token);


--
-- TOC entry 5369 (class 1259 OID 43494)
-- Name: idx_user_phone_number; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_phone_number ON public.xa_users USING btree (phone_number);


--
-- TOC entry 5370 (class 1259 OID 43499)
-- Name: idx_user_qr_code_expires_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_qr_code_expires_at ON public.xa_users USING btree (qr_code_expires_at);


--
-- TOC entry 5371 (class 1259 OID 43498)
-- Name: idx_user_qr_code_token; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_qr_code_token ON public.xa_users USING btree (qr_code_token);


--
-- TOC entry 5100 (class 1259 OID 42787)
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX idx_user_role ON public.xa_user_roles USING btree ("user", role);


--
-- TOC entry 5101 (class 1259 OID 42786)
-- Name: idx_user_role_assigned_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_role_assigned_at ON public.xa_user_roles USING btree (assigned_at);


--
-- TOC entry 5102 (class 1259 OID 42785)
-- Name: idx_user_role_assigned_by; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_role_assigned_by ON public.xa_user_roles USING btree (assigned_by);


--
-- TOC entry 5103 (class 1259 OID 42782)
-- Name: idx_user_role_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_role_guid ON public.xa_user_roles USING btree (guid);


--
-- TOC entry 5104 (class 1259 OID 42784)
-- Name: idx_user_role_role; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_role_role ON public.xa_user_roles USING btree (role);


--
-- TOC entry 5105 (class 1259 OID 42783)
-- Name: idx_user_role_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_role_user ON public.xa_user_roles USING btree ("user");


--
-- TOC entry 5372 (class 1259 OID 43492)
-- Name: idx_user_tenant; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_user_tenant ON public.xa_users USING btree (tenant);


--
-- TOC entry 5143 (class 1259 OID 42911)
-- Name: idx_work_session_created_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_created_at ON public.xa_work_sessions USING btree (created_at);


--
-- TOC entry 5144 (class 1259 OID 42909)
-- Name: idx_work_session_end_latitude; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_end_latitude ON public.xa_work_sessions USING btree (end_latitude);


--
-- TOC entry 5145 (class 1259 OID 42910)
-- Name: idx_work_session_end_longitude; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_end_longitude ON public.xa_work_sessions USING btree (end_longitude);


--
-- TOC entry 5146 (class 1259 OID 42899)
-- Name: idx_work_session_guid; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_guid ON public.xa_work_sessions USING btree (guid);


--
-- TOC entry 5147 (class 1259 OID 42904)
-- Name: idx_work_session_session_end_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_session_end_at ON public.xa_work_sessions USING btree (session_end_at);


--
-- TOC entry 5148 (class 1259 OID 42903)
-- Name: idx_work_session_session_start_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_session_start_at ON public.xa_work_sessions USING btree (session_start_at);


--
-- TOC entry 5149 (class 1259 OID 42902)
-- Name: idx_work_session_session_status; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_session_status ON public.xa_work_sessions USING btree (session_status);


--
-- TOC entry 5150 (class 1259 OID 42901)
-- Name: idx_work_session_site; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_site ON public.xa_work_sessions USING btree (site);


--
-- TOC entry 5151 (class 1259 OID 42907)
-- Name: idx_work_session_start_latitude; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_start_latitude ON public.xa_work_sessions USING btree (start_latitude);


--
-- TOC entry 5152 (class 1259 OID 42908)
-- Name: idx_work_session_start_longitude; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_start_longitude ON public.xa_work_sessions USING btree (start_longitude);


--
-- TOC entry 5153 (class 1259 OID 42906)
-- Name: idx_work_session_total_pause_duration; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_total_pause_duration ON public.xa_work_sessions USING btree (total_pause_duration);


--
-- TOC entry 5154 (class 1259 OID 42905)
-- Name: idx_work_session_total_work_duration; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_total_work_duration ON public.xa_work_sessions USING btree (total_work_duration);


--
-- TOC entry 5155 (class 1259 OID 42912)
-- Name: idx_work_session_updated_at; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_updated_at ON public.xa_work_sessions USING btree (updated_at);


--
-- TOC entry 5156 (class 1259 OID 42900)
-- Name: idx_work_session_user; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE INDEX idx_work_session_user ON public.xa_work_sessions USING btree ("user");


--
-- TOC entry 5328 (class 1259 OID 43361)
-- Name: unique_groups_active_assignments; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX unique_groups_active_assignments ON public.xa_schedule_assignments USING btree (groups) WHERE ((deleted_at IS NULL) AND (active = true) AND (groups IS NOT NULL));


--
-- TOC entry 5311 (class 1259 OID 43316)
-- Name: unique_groups_rotation; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX unique_groups_rotation ON public.xa_rotation_assignments USING btree (groups, rotation_group) WHERE ((deleted_at IS NULL) AND (groups IS NOT NULL));


--
-- TOC entry 5329 (class 1259 OID 43360)
-- Name: unique_user_active_assignments; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX unique_user_active_assignments ON public.xa_schedule_assignments USING btree ("user") WHERE ((deleted_at IS NULL) AND (active = true) AND ("user" IS NOT NULL));


--
-- TOC entry 5312 (class 1259 OID 43315)
-- Name: unique_user_rotation; Type: INDEX; Schema: public; Owner: imediatis_sarl_user_f04d
--

CREATE UNIQUE INDEX unique_user_rotation ON public.xa_rotation_assignments USING btree ("user", rotation_group) WHERE ((deleted_at IS NULL) AND ("user" IS NOT NULL));


--
-- TOC entry 5389 (class 2606 OID 42964)
-- Name: tk_memos tk_memos_affected_session_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_memos
    ADD CONSTRAINT tk_memos_affected_session_fkey FOREIGN KEY (affected_session) REFERENCES public.xa_work_sessions(id);


--
-- TOC entry 5391 (class 2606 OID 43134)
-- Name: tk_time_entries tk_time_entries_device_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_device_fkey FOREIGN KEY (device) REFERENCES public.xa_device(id);


--
-- TOC entry 5392 (class 2606 OID 43139)
-- Name: tk_time_entries tk_time_entries_memo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_memo_fkey FOREIGN KEY (memo) REFERENCES public.tk_memos(id);


--
-- TOC entry 5393 (class 2606 OID 43144)
-- Name: tk_time_entries tk_time_entries_qr_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_qr_code_fkey FOREIGN KEY (qr_code) REFERENCES public.xa_qr_code(id);


--
-- TOC entry 5394 (class 2606 OID 43119)
-- Name: tk_time_entries tk_time_entries_session_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_session_fkey FOREIGN KEY (session) REFERENCES public.xa_work_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5395 (class 2606 OID 43129)
-- Name: tk_time_entries tk_time_entries_site_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.tk_time_entries
    ADD CONSTRAINT tk_time_entries_site_fkey FOREIGN KEY (site) REFERENCES public.xa_sites(id) ON DELETE CASCADE;


--
-- TOC entry 5396 (class 2606 OID 43215)
-- Name: xa_fraud_alerts xa_fraud_alerts_time_entry_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_fraud_alerts
    ADD CONSTRAINT xa_fraud_alerts_time_entry_fkey FOREIGN KEY (time_entry) REFERENCES public.tk_time_entries(id) ON DELETE CASCADE;


--
-- TOC entry 5401 (class 2606 OID 43420)
-- Name: xa_poste xa_poste_department_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_poste
    ADD CONSTRAINT xa_poste_department_fkey FOREIGN KEY (department) REFERENCES public.xa_department(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5390 (class 2606 OID 43021)
-- Name: xa_qr_code xa_qr_code_site_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_qr_code
    ADD CONSTRAINT xa_qr_code_site_fkey FOREIGN KEY (site) REFERENCES public.xa_sites(id) ON DELETE CASCADE;


--
-- TOC entry 5397 (class 2606 OID 43293)
-- Name: xa_rotation_assignments xa_rotation_assignments_groups_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_assignments
    ADD CONSTRAINT xa_rotation_assignments_groups_fkey FOREIGN KEY (groups) REFERENCES public.xa_groups(id);


--
-- TOC entry 5398 (class 2606 OID 43298)
-- Name: xa_rotation_assignments xa_rotation_assignments_rotation_group_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_rotation_assignments
    ADD CONSTRAINT xa_rotation_assignments_rotation_group_fkey FOREIGN KEY (rotation_group) REFERENCES public.xa_rotation_groups(id);


--
-- TOC entry 5399 (class 2606 OID 43334)
-- Name: xa_schedule_assignments xa_schedule_assignments_groups_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_schedule_assignments
    ADD CONSTRAINT xa_schedule_assignments_groups_fkey FOREIGN KEY (groups) REFERENCES public.xa_groups(id);


--
-- TOC entry 5400 (class 2606 OID 43339)
-- Name: xa_schedule_assignments xa_schedule_assignments_session_template_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_schedule_assignments
    ADD CONSTRAINT xa_schedule_assignments_session_template_fkey FOREIGN KEY (session_template) REFERENCES public.xa_session_templates(id);


--
-- TOC entry 5387 (class 2606 OID 42772)
-- Name: xa_user_roles xa_user_roles_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_user_roles
    ADD CONSTRAINT xa_user_roles_role_fkey FOREIGN KEY (role) REFERENCES public.xa_roles(id);


--
-- TOC entry 5388 (class 2606 OID 42894)
-- Name: xa_work_sessions xa_work_sessions_site_fkey; Type: FK CONSTRAINT; Schema: public; Owner: imediatis_sarl_user_f04d
--

ALTER TABLE ONLY public.xa_work_sessions
    ADD CONSTRAINT xa_work_sessions_site_fkey FOREIGN KEY (site) REFERENCES public.xa_sites(id);


-- Completed on 2026-02-18 10:23:48 WAT

--
-- PostgreSQL database dump complete
--

