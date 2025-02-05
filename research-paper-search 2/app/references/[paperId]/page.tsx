"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ThemeProvider, createTheme, styled } from "@mui/material/styles"
import { Container, Box, Typography, Button, CircularProgress, Card, CardContent } from "@mui/material"
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Launch as LaunchIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material"

const theme = createTheme({
  palette: {
    primary: {
      main: "#ffffff",
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  },
})

const GradientBackground = styled(Box)({
  minHeight: "100vh",
  background: "linear-gradient(135deg, #9333EA 0%, #A855F7 100%)",
  padding: "2rem",
})

const PaperCard = styled(Card)(({ theme }) => ({
  backgroundColor: "rgba(255, 255, 255, 0.95)", // Lighter background
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  marginBottom: theme.spacing(2),
  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
  },
}))

const StyledCardContent = styled(CardContent)({
  "& .paper-title": {
    fontSize: "20px",
    fontWeight: 600,
    marginBottom: "0.75rem",
    color: "#1a1a1a",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    lineHeight: 1.4,
  },
  "& .paper-abstract": {
    color: "#4b5563",
    fontSize: "15px",
    lineHeight: 1.6,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    backgroundColor: "rgba(243, 244, 246, 0.8)",
    padding: "16px",
    borderRadius: "8px",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    marginTop: "0.5rem",
  },
  "& .paper-metadata": {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    color: "#4b5563",
    fontSize: "0.875rem",
    marginTop: "1rem",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  },
  "& .paper-url": {
    color: "#2563eb",
    wordBreak: "break-all",
    fontSize: "14px",
    marginTop: "0.5rem",
    marginBottom: "1rem",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    opacity: 0.9,
    "&:hover": {
      opacity: 1,
    },
  },
  "& .paper-keywords": {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  "& .keyword-chip": {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    padding: "0.25rem 0.75rem",
    borderRadius: "16px",
    fontSize: "0.75rem",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    border: "1px solid rgba(37, 99, 235, 0.2)",
  },
})

const PaperIdCode = styled("code")({
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  padding: "0.5rem 1rem",
  borderRadius: "8px",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  fontSize: "0.875rem",
  color: "#1a1a1a",
  fontWeight: 500,
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
})

const HeaderContainer = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "2rem",
})

const BackButton = styled(Button)({
  backgroundColor: "#2563eb",
  color: "white",
  borderRadius: "8px",
  padding: "8px 16px",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  textTransform: "none",
  fontWeight: 500,
  "&:hover": {
    backgroundColor: "#1d4ed8",
  },
})

interface CitedPaper {
  paperId: string
  url: string
  title: string
  abstract: string | null
  year: number
}

const ReferencesPage: React.FC = () => {
  const params = useParams()
  const router = useRouter()
  const paperId = params.paperId as string
  const [papers, setPapers] = useState<CitedPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const loadReferences = useCallback(async () => {
    if (!paperId) return

    setIsLoading(true)
    setError(null)
    try {
      console.log("Loading references for paper:", paperId)
      const response = await fetch(`/api/download_references`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paper_id: paperId,
          depth: 1,
        }),
      })

      const data = await response.json()
      console.log("Raw response from /download_references:", data)

      if (Array.isArray(data)) {
        const citedPapers = data
          .map((item) => {
            if (item.citedPaper) {
              return item.citedPaper
            } else if (item.paperId || item.id) {
              return {
                paperId: item.paperId || item.id,
                url: item.url || `https://www.semanticscholar.org/paper/${item.paperId || item.id}`,
                title: item.title || "Untitled Paper",
                abstract: item.abstract || null,
                year: item.year || new Date().getFullYear(),
              }
            }
            return null
          })
          .filter(Boolean)

        if (citedPapers.length > 0) {
          setPapers(citedPapers)
          setError(null)
        } else {
          throw new Error("No valid paper data found in response")
        }
      } else {
        throw new Error("Unexpected response format from server")
      }
    } catch (err) {
      console.error("Error loading references:", err)
      setError(err instanceof Error ? err.message : "Failed to load references")
      setPapers([])
    } finally {
      setIsLoading(false)
    }
  }, [paperId])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    loadReferences()
  }

  useEffect(() => {
    loadReferences()
  }, [loadReferences])

  const renderPapers = () => {
    return papers.map((paper, index) => (
      <PaperCard key={index}>
        <StyledCardContent>
          <Typography className="paper-title">{paper.title || "Untitled Paper"}</Typography>
          <Typography className="paper-url">{paper.url}</Typography>

          <div className="paper-keywords">
            {paper.title
              .split(" ")
              .filter((word) => word.length > 4)
              .slice(0, 5)
              .map((keyword, idx) => (
                <span key={idx} className="keyword-chip">
                  {keyword.toLowerCase()}
                </span>
              ))}
          </div>

          <Typography className="paper-abstract">{paper.abstract || "No abstract available."}</Typography>
          <div className="paper-metadata">
            <span>ID: {paper.paperId}</span>
            {paper.year && <span>Year: {paper.year}</span>}
            <Button
              variant="contained"
              size="small"
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LaunchIcon />}
              sx={{
                backgroundColor: "#2563eb",
                color: "white",
                "&:hover": {
                  backgroundColor: "#1d4ed8",
                },
                textTransform: "none",
                fontWeight: 500,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              View Paper
            </Button>
          </div>
        </StyledCardContent>
      </PaperCard>
    ))
  }

  return (
    <ThemeProvider theme={theme}>
      <GradientBackground>
        <Container maxWidth="lg">
          <HeaderContainer>
            <Box>
              <Typography
                variant="h1"
                sx={{
                  fontSize: "4rem",
                  fontWeight: 500,
                  color: "white",
                  mb: 3,
                }}
              >
                Paper References
              </Typography>

              <Typography
                variant="h2"
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 400,
                  color: "rgba(255, 255, 255, 0.9)",
                  mb: 2,
                }}
              >
                Showing references for paper ID:
              </Typography>

              <PaperIdCode>{paperId}</PaperIdCode>
            </Box>

            <BackButton startIcon={<ArrowBackIcon />} onClick={() => router.push("/search")}>
              Back to Search
            </BackButton>
          </HeaderContainer>

          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress sx={{ color: "white" }} />
            </Box>
          ) : error ? (
            <Box
              sx={{
                mt: 4,
                p: 4,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 28, color: "white" }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 500,
                    color: "white",
                  }}
                >
                  Unable to Load Paper Data
                </Typography>
              </Box>

              <Typography sx={{ color: "white", mb: 3, opacity: 0.9 }}>{error}</Typography>

              <Typography
                sx={{
                  color: "white",
                  mb: 2,
                  fontWeight: 500,
                }}
              >
                Technical details:
              </Typography>

              <Box
                sx={{
                  color: "white",
                  opacity: 0.9,
                  mb: 4,
                }}
              >
                <Box sx={{ mb: 1 }}>Paper ID: {paperId}</Box>
                <Box sx={{ mb: 1 }}>Attempt: {retryCount + 1}</Box>
                <Box>Time: {new Date().toISOString()}</Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleRetry}
                  startIcon={<RefreshIcon />}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                    },
                  }}
                >
                  Retry
                </Button>
                <Button
                  variant="contained"
                  onClick={() => router.push("/search")}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                    },
                  }}
                >
                  Back to Search
                </Button>
              </Box>
            </Box>
          ) : papers.length > 0 ? (
            <Box sx={{ mt: 4 }}>{renderPapers()}</Box>
          ) : null}
        </Container>
      </GradientBackground>
    </ThemeProvider>
  )
}

export default ReferencesPage

