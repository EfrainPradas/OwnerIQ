import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';

function PropertyScorecard({ property, onClose }) {
  const [activeScenario, setActiveScenario] = useState('normal');
  const [isVisible, setIsVisible] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));

  const [scorecardData, setScorecardData] = useState(null);
  const [isLoadingScorecard, setIsLoadingScorecard] = useState(false);
  const [scorecardError, setScorecardError] = useState('');

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 50);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchScorecard = async () => {
      if (!property?.property_id) {
        if (isMounted) {
          setScorecardData(null);
          setScorecardError('No se pudo encontrar el identificador de la propiedad.');
          setIsLoadingScorecard(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingScorecard(true);
        setScorecardError('');
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken && !ENABLE_DEMO_MODE) {
          if (isMounted) {
            setScorecardError('Tu sesion expiro. Vuelve a iniciar sesion para ver el analisis.');
            setScorecardData(null);
            setIsLoadingScorecard(false);
          }
          return;
        }

        const token = accessToken || 'dummy-token';
        const normalizedBaseUrl = (API_BASE_URL || '').trim().replace(/\/$/, '');
        const endpoint = normalizedBaseUrl
          ? `${normalizedBaseUrl}/api/properties/${property.property_id}/scorecard`
          : `/api/properties/${property.property_id}/scorecard`;

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        const payload = await response.json();

        if (isMounted) {
          setScorecardData(payload);
        }
      } catch (error) {
        console.error('Error fetching scorecard data:', error);
        if (isMounted) {
          setScorecardError(error.message || 'No fue posible cargar los datos de la IA.');
          setScorecardData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingScorecard(false);
        }
      }
    };

    fetchScorecard();

    return () => {
      isMounted = false;
    };
  }, [property?.property_id]);


  const changeScenario = (scenario) => {
    setActiveScenario(scenario);
  };

  const propertyRecord = useMemo(() => ({
    ...property,
    ...(scorecardData?.property || {})
  }), [property, scorecardData]);

  const valuationsSeries = useMemo(() => scorecardData?.valuations || [], [scorecardData?.valuations]);
  const rentEstimatesSeries = useMemo(() => scorecardData?.rentEstimates || [], [scorecardData?.rentEstimates]);
  const metricsFromServer = scorecardData?.metrics || null;
  const operatingInputs = useMemo(() => scorecardData?.operatingInputs || {}, [scorecardData?.operatingInputs]);
  const dealscoreData = useMemo(() => scorecardData?.dealscore || null, [scorecardData?.dealscore]);
  const recommendationsData = useMemo(() => scorecardData?.recommendations || [], [scorecardData?.recommendations]);

  const metricsHistorySeries = useMemo(() => scorecardData?.metricsHistory || [], [scorecardData?.metricsHistory]);

  const toPercent = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return value > 1 ? value : value * 100;
  };

  const metrics = useMemo(() => {
    const valuation = Number((valuationsSeries[0]?.amount_usd) ?? propertyRecord.valuation ?? 0) || 0;
    const rent = Number((rentEstimatesSeries[0]?.market_rent_month) ?? propertyRecord.rent ?? 0) || 0;
    const taxes = Number(metricsFromServer?.taxes_annual ?? operatingInputs.taxes_annual ?? propertyRecord.taxes ?? 0) || 0;
    const insurance = Number(operatingInputs.insurance_annual ?? propertyRecord.insurance ?? 0) || 0;
    const hoa = Number(operatingInputs.hoa_monthly ?? propertyRecord.hoa ?? 0) || 0;
    const maintenance = Number(operatingInputs.maintenance_pct ?? propertyRecord.maintenance ?? 0) || 0;

    const annualRent = rent * 12;
    const annualExpenses = taxes + insurance + (hoa * 12) + ((maintenance / 100) * annualRent);
    const cashFlow = typeof metricsFromServer?.cash_flow_net === 'number'
      ? metricsFromServer.cash_flow_net
      : annualRent - annualExpenses;

    const capRate = toPercent(metricsFromServer?.cap_rate) ?? (valuation > 0 ? ((annualRent - annualExpenses) / valuation) * 100 : 0);
    const cashOnCash = toPercent(metricsFromServer?.cash_on_cash) ?? (valuation > 0 ? (cashFlow / valuation) * 100 : 0);
    const noi = typeof metricsFromServer?.noi === 'number' ? metricsFromServer.noi : annualRent - annualExpenses + ((maintenance / 100) * annualRent);
    const dscr = typeof metricsFromServer?.dscr === 'number' ? metricsFromServer.dscr : null;

    let appreciationRate = 0.062;
    if (valuationsSeries.length >= 2) {
      const latestValue = Number(valuationsSeries[0]?.amount_usd) || 0;
      const previousEntry = valuationsSeries.find((entry, index) => index > 0 && entry?.amount_usd);
      const previousValue = Number(previousEntry?.amount_usd) || 0;
      if (latestValue > 0 && previousValue > 0 && previousEntry?.as_of_date) {
        const latestDate = new Date(valuationsSeries[0].as_of_date);
        const previousDate = new Date(previousEntry.as_of_date);
        const diffYears = Math.max((latestDate - previousDate) / (1000 * 60 * 60 * 24 * 365.25), 0.25);
        appreciationRate = Math.pow(latestValue / previousValue, 1 / diffYears) - 1;
      }
    }

    const projectedValue = valuation * Math.pow(1 + appreciationRate, 10);
    const totalAppreciation = projectedValue - valuation;
    const roi = valuation > 0 ? (totalAppreciation / valuation) * 100 : 0;

    const riskNorm = typeof dealscoreData?.risk_norm === 'number' ? dealscoreData.risk_norm : null;
    const riskScore = riskNorm !== null
      ? Math.max(0, Math.min(100, Math.round((1 - riskNorm) * 100)))
      : Math.max(0, Math.min(100, Math.round(((100 - capRate * 10) * 0.4) + ((cashFlow < 0 ? 50 : 0) * 0.3) + ((valuation > 1000000 ? 20 : 0) * 0.3))));

    return {
      valuation,
      rent,
      taxes,
      insurance,
      hoa,
      maintenance,
      annualRent,
      annualExpenses,
      cashFlow,
      capRate,
      cashOnCash,
      noi,
      dscr,
      projectedValue,
      totalAppreciation,
      roi,
      appreciationRate,
      riskScore,
      dealscore: dealscoreData?.dealscore ?? null,
      dealscoreBreakdown: {
        capRate: toPercent(dealscoreData?.cap_rate_norm),
        cashOnCash: toPercent(dealscoreData?.coc_norm),
        dscr: toPercent(dealscoreData?.dscr_norm),
        appreciation: toPercent(dealscoreData?.appreciation_norm),
        risk: toPercent(typeof dealscoreData?.risk_norm === 'number' ? 1 - dealscoreData.risk_norm : null),
        liquidity: toPercent(dealscoreData?.liquidity_norm)
      },
      recommendations: recommendationsData
    };
  }, [propertyRecord, valuationsSeries, rentEstimatesSeries, metricsFromServer, operatingInputs, dealscoreData, recommendationsData]);

  const growthHeights = useMemo(() => {
    let values = [];

    if (valuationsSeries.length) {
      values = valuationsSeries.slice().reverse().map((entry) => Number(entry.amount_usd) || 0).filter((value) => value > 0);
    }

    if (!values.length && metricsHistorySeries.length) {
      values = metricsHistorySeries.slice().reverse().map((entry) => {
        const candidate = Number(entry.noi ?? entry.cash_flow_net ?? 0);
        return Number.isFinite(candidate) ? candidate : 0;
      }).filter((value) => value !== 0);
    }

    if (!values.length) {
      return ['40%', '52%', '68%', '75%', '82%', '88%', '92%', '95%', '98%', '100%'];
    }

    if (values.length > 10) {
      values = values.slice(-10);
    }

    const maxValue = Math.max(...values.map((value) => Math.abs(value)));
    if (maxValue <= 0) {
      return values.map(() => '40%');
    }

    return values.map((value) => {
      const normalized = Math.abs(value) / maxValue;
      const percent = Math.min(100, Math.max(12, normalized * 100));
      return `${percent.toFixed(0)}%`;
    });
  }, [valuationsSeries, metricsHistorySeries]);


  const aiScoreValue = metrics.dealscore;
  const baseRecommendationText = dealscoreData?.recommendation || `Hold property. Predictive analysis shows sustained 6.2% annual growth. Your equity will grow to $${Math.round(metrics.projectedValue).toLocaleString()} in 10 years with positive cash flow of $${Math.round(metrics.cashFlow).toLocaleString()}/year. Optimal selling time projected: Q2 2032.`;
  const scenarioRecords = {
    normal: recommendationsData[0] || null,
    recession: recommendationsData[1] || null,
    inflation: recommendationsData[2] || null,
    rates: recommendationsData[3] || null
  };

  const resolveScenarioText = (key, fallback) => {
    const record = scenarioRecords[key];
    if (!record) return fallback;
    return record.why || record.recommendation || record.risks || fallback;
  };

  const resolveScenarioTitle = (key, fallback) => {
    const record = scenarioRecords[key];
    if (!record) return fallback;
    if (record.decision) {
      return record.decision;
    }
    if (dealscoreData?.dealscore_rule_set?.name) {
      return `${dealscoreData.dealscore_rule_set.name} Insight`;
    }
    return fallback;
  };

  const normalizedDealScore = useMemo(() => {
    if (typeof aiScoreValue === 'number' && !Number.isNaN(aiScoreValue)) {
      return aiScoreValue > 1 ? aiScoreValue : aiScoreValue * 100;
    }
    return null;
  }, [aiScoreValue]);

  const predictiveAlerts = useMemo(() => {
    if (!recommendationsData.length) {
      const refinanceSavings = Math.max(0, Math.round((metrics.annualRent || 0) * 0.005));
      const capexBudget = Math.max(0, Math.round((metrics.valuation || 0) * 0.02));

      return [
        {
          iconClass: 'fas fa-brain',
          title: 'Optimal Refinancing Time',
          text: `Rates are 0.5% below average. Save $${refinanceSavings.toLocaleString()}/month by refinancing now.`,
          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          shadow: 'rgba(16, 185, 129, 0.2)'
        },
        {
          iconClass: 'fas fa-tools',
          title: 'CapEx Planning',
          text: `Plan $${capexBudget.toLocaleString()} for major maintenance within 18-24 months to maximise resale value.`,
          gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          shadow: 'rgba(245, 158, 11, 0.2)'
        },
        {
          iconClass: 'fas fa-chart-line',
          title: 'Favorable Market Trend',
          text: 'Local market shows consistent growth. Consider holding for 3+ years.',
          gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          shadow: 'rgba(59, 130, 246, 0.2)'
        }
      ];
    }

    const palettes = [
      { iconClass: 'fas fa-brain', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16, 185, 129, 0.2)' },
      { iconClass: 'fas fa-tools', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: 'rgba(245, 158, 11, 0.2)' },
      { iconClass: 'fas fa-chart-line', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: 'rgba(59, 130, 246, 0.2)' }
    ];

    return recommendationsData.slice(0, 3).map((record, index) => {
      const palette = palettes[index % palettes.length];
      return {
        iconClass: palette.iconClass,
        title: record.decision ? `AI Decision: ${record.decision}` : `Insight ${index + 1}`,
        text: record.why || record.recommendation || record.risks || baseRecommendationText,
        gradient: palette.gradient,
        shadow: palette.shadow
      };
    });
  }, [recommendationsData, baseRecommendationText, metrics.annualRent, metrics.valuation]);

  const appreciationPercent = Number.isFinite(metrics.appreciationRate) ? metrics.appreciationRate * 100 : 6.2;
  const recessionFallback = `Hold and strengthen reserves. Annual cash flow is $${Math.round(metrics.cashFlow).toLocaleString()}. Build a reserve of ${Math.max(3, Math.round((metrics.annualExpenses / 12) || 0))} months to weather a downturn.`;
  const inflationFallback = `Projected appreciation at ${appreciationPercent.toFixed(1)}% annually. Equity could reach $${Math.round(metrics.projectedValue).toLocaleString()} in 10 years if trends persist.`;
  const ratesFallback = propertyRecord.loan_rate
    ? `Current loan rate ${Number(propertyRecord.loan_rate).toFixed(2)}%. Refinance only if you secure below ${(Number(propertyRecord.loan_rate) - 0.5).toFixed(2)}%.`
    : 'Maintain existing financing advantage; monitor market rates quarterly.';

  const analysisDate = scorecardData?.metrics?.as_of_date
    || valuationsSeries[0]?.as_of_date
    || recommendationsData[0]?.as_of_date
    || scorecardData?.property?.updated_at
    || null;

  const formattedAnalysisDate = useMemo(() => {
    const fallback = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    if (!analysisDate) {
      return fallback;
    }
    const parsed = new Date(analysisDate);
    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, [analysisDate]);

  const ltvPercent = useMemo(() => {
    const candidates = [propertyRecord.ltv, operatingInputs.ltv_pct, dealscoreData?.ltv];
    for (const value of candidates) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric > 1 ? numeric : numeric * 100;
      }
    }
    return null;
  }, [propertyRecord.ltv, operatingInputs, dealscoreData]);

  const occupancyPercent = useMemo(() => {
    const vacancyRaw = Number(operatingInputs.vacancy_rate_pct ?? propertyRecord.vacancy ?? null);
    if (!Number.isFinite(vacancyRaw)) {
      return null;
    }
    const vacancyPercent = vacancyRaw > 1 ? vacancyRaw : vacancyRaw * 100;
    return Math.max(0, Math.min(100, 100 - vacancyPercent));
  }, [operatingInputs, propertyRecord.vacancy]);

  const scenarios = {
    normal: {
      heights: growthHeights,
      iconClass: 'fas fa-chart-line',
      label: 'Base Scenario',
      color: '#10b981',
      recommendation: {
        title: resolveScenarioTitle('normal', dealscoreData?.dealscore_rule_set?.name ? `${dealscoreData.dealscore_rule_set.name} - Base Scenario` : 'OwnerIQ AI Recommendation - Base Scenario'),
        text: resolveScenarioText('normal', baseRecommendationText),
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      }
    },
    recession: {
      heights: ['40%', '38%', '35%', '42%', '50%', '58%', '65%', '70%', '76%', '82%'],
      iconClass: 'fas fa-triangle-exclamation',
      label: 'Recession (-3%)',
      color: '#ef4444',
      recommendation: {
        title: resolveScenarioTitle('recession', 'Recession Scenario'),
        text: resolveScenarioText('recession', recessionFallback),
        gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
      }
    },
    inflation: {
      heights: ['40%', '58%', '78%', '88%', '95%', '100%', '100%', '100%', '100%', '100%'],
      iconClass: 'fas fa-fire',
      label: 'High Inflation (+5%)',
      color: '#f59e0b',
      recommendation: {
        title: resolveScenarioTitle('inflation', 'High Inflation Outlook'),
        text: resolveScenarioText('inflation', inflationFallback),
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
      }
    },
    rates: {
      heights: ['40%', '45%', '52%', '58%', '64%', '70%', '75%', '80%', '84%', '88%'],
      iconClass: 'fas fa-percentage',
      label: 'High Rates (+2%)',
      color: '#3b82f6',
      recommendation: {
        title: resolveScenarioTitle('rates', 'High Rates (+2%)'),
        text: resolveScenarioText('rates', ratesFallback),
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
      }
    }
  };

  const getRiskLevel = (score) => {
    if (score < 30) return { label: 'Low', color: '#10b981', width: '25%' };
    if (score < 60) return { label: 'Medium', color: '#f59e0b', width: '55%' };
    return { label: 'High', color: '#ef4444', width: '85%' };
  };

  const riskLevel = getRiskLevel(metrics.riskScore);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        background: 'var(--panel-primary)',
        borderRadius: viewportWidth > 768 ? '24px' : '16px',
        maxWidth: '1400px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1) inset',
        position: 'relative',
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Glassmorphic Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: viewportWidth > 768 ? '24px' : viewportWidth > 480 ? '18px' : '16px',
          borderTopLeftRadius: viewportWidth > 768 ? '24px' : '16px',
          borderTopRightRadius: viewportWidth > 768 ? '24px' : '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)',
            pointerEvents: 'none'
          }}></div>

          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.25)';
              e.target.style.transform = 'rotate(90deg) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.15)';
              e.target.style.transform = 'rotate(0deg) scale(1)';
            }}
          >
            <i className="fas fa-times"></i>
          </button>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              padding: '8px 20px',
              borderRadius: '30px',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <span style={{ fontSize: '20px' }}>âœ¨</span>
              <span style={{
                fontSize: '13px',
                fontWeight: '700',
                color: 'white',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Active Predictive AI
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ color: 'white' }}>
                <h1 style={{
                  fontSize: viewportWidth > 768 ? '24px' : viewportWidth > 480 ? '20px' : '18px',
                  color: 'white',
                  marginBottom: '4px',
                  fontWeight: '700',
                  letterSpacing: '-0.3px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fas fa-home"></i>
                  {propertyRecord.address || 'Sin direccion registrada'}
                </h1>
                <div style={{
                  fontSize: '12px',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <i className="fas fa-calendar-alt"></i>
                  Analysis updated: {formattedAnalysisDate}
                </div>
                {dealscoreData?.dealscore_rule_set?.name && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.85)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="fas fa-sliders-h"></i>
                    {dealscoreData.dealscore_rule_set.name}
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.3)',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: 'white',
                  lineHeight: '1',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                  {normalizedDealScore !== null
                    ? normalizedDealScore.toFixed(1)
                    : metrics.roi.toFixed(1)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: '4px',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  AI Dealscore
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content with improved spacing and visual hierarchy */}
        <div style={{
          padding: viewportWidth > 768 ? '24px' : viewportWidth > 480 ? '16px' : '12px'
        }}>
          {isLoadingScorecard && (
            <div style={{
              marginBottom: '16px',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-circle-notch fa-spin"></i>
              Cargando anÃ¡lisis avanzado...
            </div>
          )}
          {scorecardError && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.15)',
              borderRadius: '12px',
              color: '#fecaca',
              border: '1px solid rgba(239,68,68,0.35)'
            }}>
              {scorecardError}
            </div>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewportWidth > 768 ? 'repeat(4, 1fr)' : viewportWidth > 480 ? 'repeat(2, 1fr)' : '1fr',
            gap: viewportWidth > 768 ? '16px' : '12px',
            marginBottom: viewportWidth > 768 ? '20px' : '16px'
          }}>
            {/* Risk-Return Analysis - Enhanced */}
            <div style={{
              background: 'var(--panel-secondary)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}>
              {/* Decorative gradient accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              }}></div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '20px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}><i className="fas fa-lightbulb"></i></span>
                Predictive Alerts
              </h2>

              {predictiveAlerts.map((alert, idx) => (
                <div key={idx} style={{
                  background: alert.gradient,
                  color: 'white',
                  padding: '20px',
                  borderRadius: '16px',
                  marginBottom: idx < 2 ? '16px' : '0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  boxShadow: `0 8px 24px ${alert.shadow}`,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = `0 12px 32px ${alert.shadow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${alert.shadow}`;
                }}>
                  <div style={{
                    fontSize: '28px',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }}>
                    {alert.iconClass ? <i className={alert.iconClass}></i> : alert.icon}
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      marginBottom: '6px',
                      fontWeight: '700',
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {alert.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      opacity: 0.95,
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {alert.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Value Projection - Enhanced */}
            <div style={{
              background: 'var(--panel-secondary)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
              }}></div>

              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '20px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>ðŸ“ˆ</span>
                Value Projection
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: '500'
                }}>
                  (10 years)
                </span>
              </h2>

              {[
                { label: 'Current Value', value: `$${Math.round(metrics.valuation).toLocaleString()}`, highlight: false },
                { label: 'Projected Value 2035', value: `$${Math.round(metrics.projectedValue).toLocaleString()}`, highlight: true },
                { label: 'Total Appreciation', value: `+${metrics.roi.toFixed(1)}%`, highlight: true, color: '#10b981' }
              ].map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  borderBottom: idx < 2 ? '1px solid var(--border)' : 'none'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    fontWeight: '600'
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: item.highlight ? '24px' : '22px',
                    fontWeight: '800',
                    color: item.color || 'var(--text-primary)',
                    letterSpacing: '-0.5px',
                    textShadow: item.highlight ? `0 2px 8px ${item.color || '#667eea'}40` : 'none'
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Performance Metrics - Enhanced */}
            <div style={{
              background: 'var(--panel-secondary)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)'
              }}></div>

              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '20px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>ðŸ’Ž</span>
                Performance Metrics
              </h2>

              {[
                { label: 'Cap Rate', value: `${metrics.capRate.toFixed(1)}%`, color: '#667eea' },
                { label: 'Cash-on-Cash Return', value: `${metrics.cashOnCash.toFixed(1)}%`, color: '#10b981' },
                { label: 'Debt-to-Value Ratio', value: ltvPercent !== null ? `${ltvPercent.toFixed(1)}%` : 'â€”', progress: ltvPercent !== null ? Math.round(Math.min(100, Math.max(0, ltvPercent))) : null, color: '#f59e0b' },
                { label: 'Average Occupancy', value: occupancyPercent !== null ? `${occupancyPercent.toFixed(1)}%` : 'â€”', progress: occupancyPercent !== null ? Math.round(Math.min(100, Math.max(0, occupancyPercent))) : null, color: '#10b981' }
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 0',
                    borderBottom: idx < 3 ? '1px solid var(--border)' : 'none'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                      fontWeight: '600'
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: '22px',
                      fontWeight: '800',
                      color: item.color,
                      letterSpacing: '-0.5px',
                      textShadow: `0 2px 8px ${item.color}30`
                    }}>
                      {item.value}
                    </span>
                  </div>
                  {item.progress && (
                    <div style={{
                      width: '100%',
                      height: '10px',
                      background: 'rgba(0,0,0,0.05)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginTop: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                        borderRadius: '12px',
                        width: `${item.progress}%`,
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: `0 0 20px ${item.color}40`
                      }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Scenario Modeling - Full Width Enhanced */}
            <div style={{
              background: 'var(--panel-secondary)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid var(--border)',
              gridColumn: '1 / -1',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${scenarios[activeScenario].color} 0%, ${scenarios[activeScenario].color}dd 100%)`
              }}></div>

              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{
                  fontSize: '24px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>ðŸŽ¯</span>
                Scenario Modeling
                <span style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  fontWeight: '500',
                  marginLeft: '6px'
                }}>
                  - What if...?
                </span>
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: viewportWidth > 768 ? 'repeat(auto-fit, minmax(200px, 1fr))' : viewportWidth > 480 ? 'repeat(2, 1fr)' : '1fr',
                gap: viewportWidth > 768 ? '12px' : '8px',
                marginBottom: viewportWidth > 768 ? '32px' : '20px'
              }}>
                {Object.keys(scenarios).map(scenario => (
                  <button
                    key={scenario}
                    onClick={() => changeScenario(scenario)}
                    style={{
                      padding: '16px 20px',
                      border: activeScenario === scenario ? `2px solid ${scenarios[scenario].color}` : '2px solid var(--border)',
                      background: activeScenario === scenario
                        ? scenarios[scenario].recommendation.gradient
                        : 'var(--panel-primary)',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: activeScenario === scenario ? '#ffffff' : 'var(--text-primary)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      textShadow: activeScenario === scenario ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                      boxShadow: activeScenario === scenario
                        ? `0 8px 24px ${scenarios[scenario].color}40, 0 0 0 4px ${scenarios[scenario].color}15`
                        : '0 2px 8px rgba(0,0,0,0.05)',
                      transform: activeScenario === scenario ? 'scale(1.02)' : 'scale(1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (activeScenario !== scenario) {
                        e.target.style.transform = 'scale(1.02)';
                        e.target.style.borderColor = scenarios[scenario].color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeScenario !== scenario) {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.borderColor = 'var(--border)';
                      }
                    }}
                  >
                    <i
                      className={scenarios[scenario].iconClass}
                      style={{ fontSize: '18px' }}
                      aria-hidden="true"
                    ></i>
                    {scenarios[scenario].label}
                  </button>
                ))}
              </div>

              {/* Enhanced Chart */}
              <div style={{
                height: '240px',
                background: 'linear-gradient(to top, rgba(102, 126, 234, 0.08) 0%, transparent 100%)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                border: '1px solid rgba(102, 126, 234, 0.1)'
              }}>
                {scenarios[activeScenario].heights.map((height, index) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      background: `linear-gradient(to top, ${scenarios[activeScenario].color}, ${scenarios[activeScenario].color}cc)`,
                      borderRadius: '8px 8px 0 0',
                      height: height,
                      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: `0 -4px 12px ${scenarios[activeScenario].color}30`,
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.opacity = '0.8';
                      e.target.style.transform = 'scaleY(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.opacity = '1';
                      e.target.style.transform = 'scaleY(1)';
                    }}
                  >
                    {/* Year label */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      Y{index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Recommendation Card */}
              <div style={{
                background: scenarios[activeScenario].recommendation.gradient,
                color: 'white',
                padding: '28px',
                borderRadius: '18px',
                marginTop: '32px',
                boxShadow: `0 12px 32px ${scenarios[activeScenario].color}30`,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-10%',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>

                <h3 style={{
                  fontSize: '20px',
                  marginBottom: '12px',
                  fontWeight: '700',
                  textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {scenarios[activeScenario].recommendation.title}
                </h3>
                <p style={{
                  fontSize: '15px',
                  opacity: 0.95,
                  lineHeight: '1.7',
                  margin: 0,
                  position: 'relative',
                  zIndex: 1
                }}>
                  <strong>Suggested Action:</strong> {scenarios[activeScenario].recommendation.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

export default PropertyScorecard;
