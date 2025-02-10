import FacebookIcon from '@mui/icons-material/Facebook'
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  DialogContent,
  DialogContentText,
  IconButton,
  LinearProgress,
  Link,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material'
import Toolbar from '@mui/material/Toolbar'
import Grid2 from '@mui/material/Unstable_Grid2'
import { DataSnapshot, onValue, ref, remove, set, Unsubscribe } from 'firebase/database'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import Announcement from '../Components/Announcement'
import FabCreate from '../Components/FabCreate'
import FacebookPostsMasonry from '../Components/FacebookPostsMasonry'
import MultiActionDialog from '../Components/MultiActionDialog'
import FACEBOOK_POSTS, { FACEBOOK_AVATAR } from '../data/FacebookPosts'
import { AnnouncementContext, AnnouncementHandler } from '../store/AnnouncementProvider'
import { database } from '../store/Firebase'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { PrettyPost } from '../util/PrettyPost'
import { withBaseURL } from '../util/string'
import { SupportedLocale } from '../util/SupportedLocale'
import { SUSANNA_USER_ID, UserRole } from '../util/User'

interface LatestNewsTexts {
  addPosts: string
  add: string
  cancel: string
  addPost: string
  deletePost: string
  delete: string
  areYouSureDescription: string
  addingPosts: string
}

const EN_US: LatestNewsTexts = {
  addPosts: 'Add Posts',
  add: 'Add',
  cancel: 'Cancel',
  addPost: 'Add Post',
  deletePost: 'Delete Post',
  delete: 'Delete',
  areYouSureDescription: 'Are you sure you want to delete this post?',
  addingPosts: 'Adding posts, please wait...'
}

const RO_RO: LatestNewsTexts = {
  addPosts: 'Adaugă postări',
  add: 'Adaugă',
  cancel: 'Anulează',
  addPost: 'Adaugă postare',
  deletePost: 'Șterge postarea',
  delete: 'Șterge',
  areYouSureDescription: 'Sigur doriți să ștergeți această postare?',
  addingPosts: 'Se adaugă postările, vă rugăm așteptați...'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

export default function LatestNews() {
  const strings = useContext<LocaleHandler>(LocaleContext).globalStringList

  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => {
    localeManager.registerComponentStrings(LatestNews.name, TEXTS)
  }, [])
  const componentStrings = localeManager.componentStrings(LatestNews.name)

  const theme = useTheme()
  const sm = useMediaQuery(theme.breakpoints.up('sm'))
  const xs = useMediaQuery(theme.breakpoints.up('xs'))
  const announcementManager = useContext<AnnouncementHandler>(AnnouncementContext)

  const currentPosts = useRef<PrettyPost[]>(FACEBOOK_POSTS)
  const [posts, setPosts] = useState<PrettyPost[]>(FACEBOOK_POSTS)
  const [deletedPosts, setDeletedPosts] = useState<Set<string>>(new Set<string>())
  const postsUnsubscriberRef = useRef<Unsubscribe>()
  const deletedPostsUnsubscriberRef = useRef<Unsubscribe>()

  const handlePostsFromDb = useMemo(
    () => (snapshot: DataSnapshot) => {
      const dbPosts = snapshot.val()
      if (!dbPosts) {
        return
      }

      const uniquePostIds = new Set<string>()
      const filteredPosts = (Object.values(dbPosts).concat(FACEBOOK_POSTS) as PrettyPost[])
        .filter((v) => {
          if (uniquePostIds.has(v.id)) {
            return false
          }
          uniquePostIds.add(v.id)
          return !deletedPosts.has(v.id)
        })
        .sort(
          (post1, post2) =>
            new Date(post2.creationTime).getTime() - new Date(post1.creationTime).getTime()
        )

      currentPosts.current = filteredPosts
      setPosts(filteredPosts)
    },
    []
  )

  const handleDeletedPostsFromDb = useMemo(
    () => (snapshot: DataSnapshot) => {
      const deletedPostsDb = snapshot.val()
      if (!deletedPostsDb) {
        return
      }

      const deletedPostsSet = new Set<string>(Object.keys(deletedPostsDb))
      setDeletedPosts(deletedPostsSet)

      const uniquePostIds = new Set<string>()
      const filteredPosts = currentPosts.current.filter((v) => {
        if (uniquePostIds.has(v.id)) {
          return false
        }
        uniquePostIds.add(v.id)
        return !deletedPostsSet.has(v.id)
      })

      currentPosts.current = filteredPosts
      setPosts(filteredPosts)
    },
    [posts]
  )

  useEffect(() => {
    postsUnsubscriberRef.current?.()
    // Subscribe to changes in posts
    postsUnsubscriberRef.current = onValue(
      ref(database, `posts/teachers/${SUSANNA_USER_ID}`),
      (snapshot) => handlePostsFromDb(snapshot),
      (error) => {
        console.error(`Could not retrieve posts for teacher ${SUSANNA_USER_ID}: ${error}`)
      }
    )
    return () => {
      postsUnsubscriberRef.current?.()
    }
  }, [])

  useEffect(() => {
    deletedPostsUnsubscriberRef.current?.()
    deletedPostsUnsubscriberRef.current = onValue(
      ref(database, `deleted/posts/teachers/${SUSANNA_USER_ID}`),
      (snapshot) => handleDeletedPostsFromDb(snapshot),
      (error) => {
        console.error(`Could not retrieve deleted posts for teacher ${SUSANNA_USER_ID}: ${error}`)
      }
    )
    return () => {
      deletedPostsUnsubscriberRef.current?.()
    }
  }, [])

  const { user } = useUser()

  const [openAddPostsDialog, setOpenAddPostsDialog] = useState<boolean>(false)
  const [postData, setPostData] = useState<PrettyPost[] | null>(null)
  const [postAlert, setPostAlert] = useState<string | null>(null)
  const [postAlertSeverity, setPostAlertSeverity] = useState<
    'success' | 'info' | 'warning' | 'error'
  >('info')
  const selectedPosts = useRef<Map<string, PrettyPost>>(new Map<string, PrettyPost>())

  const [openAreYouSureDialog, setOpenAreYouSureDialog] = useState<boolean>(false)
  const [postIdSelectedForDeletion, setPostIdSelectedForDeletion] = useState<string | null>(null)
  const [postsSaving, setPostsSaving] = useState<boolean>(false)

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        // `http://127.0.0.1:5001/music-with-susanna/europe-west1/fetchYoutubeVideo?id=${id}`,
        `https://europe-west1-music-with-susanna.cloudfunctions.net/fetchFacebookPosts`,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`
          }
        }
      )
      const data = await response.json()
      setPostData(data)
      setPostAlert(null)
    } catch (error) {
      console.error('Error fetching posts:', error)
      setPostData(null)
      setPostAlert(`Could not fetch posts: ${error}; prease refresh the page and try again.`)
      setPostAlertSeverity('error')
    }
  }

  const addPosts = async () => {
    try {
      setPostAlert(componentStrings.addingPosts)
      setPostAlertSeverity('info')

      for (const postId of selectedPosts.current.keys()) {
        void remove(ref(database, `posts/teachers/${SUSANNA_USER_ID}/${postId}`))
      }

      const postIdsQuery = Array.from(selectedPosts.current.keys())
        .map((id) => `postId=${id}`)
        .join('&')

      const response = await fetch(
        // `http://127.0.0.1:5001/music-with-susanna/europe-west1/fetchYoutubeVideo?id=${id}`,
        `https://europe-west1-music-with-susanna.cloudfunctions.net/saveFacebookPostPhotos?${postIdsQuery}`,
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`
          }
        }
      )
      const data = await response.json()
      console.log('Data:', data)

      setPostAlert(null)
      setOpenAddPostsDialog(false)
    } catch (error) {
      console.error('Error saving posts posts:', error)
      setPostData(null)
      setPostAlert(`Could not add posts: ${error}; prease refresh the page and try again.`)
      setPostAlertSeverity('error')
      return false
    } finally {
      setPostsSaving(false)
    }
  }

  return (
    <>
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Toolbar />
        <Grid2 container spacing={2}>
          <Grid2 xs={12}>
            <Card>
              {!announcementManager.hidden && <Announcement />}
              <Grid2 container>
                <Grid2
                  xs={12}
                  // For getting the image to stretch to the available space.
                  // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                  <CardMedia
                    component="img"
                    // TODO: Use breakpoint images (smaller images for smaller screens)
                    image={withBaseURL('/static/img/facebook-cover-photo.jpeg')}
                    alt="Cover Photo"
                    // For getting the image to stretch to the available space.
                    // See https://stackoverflow.com/questions/14142378/how-can-i-fill-a-div-with-an-image-while-keeping-it-proportional
                    sx={{
                      flexShrink: 0,
                      minWidth: '100%',
                      minHeight: '100%'
                    }}
                  />
                </Grid2>
              </Grid2>
              <CardContent sx={{ position: 'relative', p: 0 }}>
                <Avatar
                  alt="Susanna Johnson-Chelaru"
                  src={withBaseURL(FACEBOOK_AVATAR)}
                  sx={{
                    width: 168,
                    height: 168,
                    position: 'absolute',
                    top: -84,
                    left: sm ? 30 : 'calc(50% - 84px)',
                    borderStyle: 'solid',
                    borderWidth: 5,
                    borderColor: theme.palette.background.paper
                  }}
                />
                <Typography
                  variant="h4"
                  gutterBottom
                  component={Link}
                  underline="hover"
                  color="inherit"
                  rel="noreferrer"
                  target="_blank"
                  href="https://www.facebook.com/MusicwithMsJohnson"
                  sx={{
                    position: 'absolute',
                    left: 208,
                    top: 15,
                    display: xs && !sm ? 'none' : 'block'
                  }}>
                  {strings.news}
                </Typography>
              </CardContent>
              <CardActions sx={{ pb: 2, pr: 2, pt: 2 }}>
                <IconButton
                  aria-label="Share on Facebook"
                  sx={{ marginLeft: 'auto' }}
                  size="large"
                  rel="noreferrer"
                  target="_blank"
                  href="https://www.facebook.com/MusicwithMsJohnson">
                  <FacebookIcon fontSize="inherit" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid2>
          <Grid2 xs={12}>
            <FacebookPostsMasonry
              posts={posts}
              onPostDelete={
                user?.role !== UserRole.TEACHER
                  ? undefined
                  : (post) => {
                      setPostIdSelectedForDeletion(post.id)
                      setOpenAreYouSureDialog(true)
                    }
              }
            />
          </Grid2>
        </Grid2>
      </Container>

      {user?.role === UserRole.TEACHER && (
        <FabCreate
          onClick={() => {
            setOpenAddPostsDialog(true)
            void fetchPosts()
          }}
        />
      )}

      <MultiActionDialog
        open={openAddPostsDialog}
        onClose={() => setOpenAddPostsDialog(false)}
        aria-describedby="alert-dialog-description"
        title={componentStrings.addPosts}
        actions={[
          { label: componentStrings.cancel, onClick: () => setOpenAddPostsDialog(false) },
          {
            label: componentStrings.add,
            onClick: () => {
              if (!selectedPosts.current.size) {
                return
              }

              setPostsSaving(true)

              void addPosts()
            }
          }
        ]}
        maxWidth={false}
        PaperProps={{ sx: { width: 800 } }}>
        <DialogContent>
          {!postData && !postAlert && !postsSaving && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}
          {postAlert && <Alert severity={postAlertSeverity}>{postAlert}</Alert>}
          {postsSaving && (
            <>
              <br />
              <LinearProgress />
            </>
          )}
          {postData && !postsSaving && (
            <FacebookPostsMasonry
              posts={postData}
              onPostSelectToggle={(post, selected) => {
                if (selected) {
                  selectedPosts.current.set(post.id, post)
                } else {
                  selectedPosts.current.delete(post.id)
                }
              }}
            />
          )}
        </DialogContent>
      </MultiActionDialog>

      <MultiActionDialog
        open={openAreYouSureDialog}
        onClose={() => setOpenAreYouSureDialog(false)}
        aria-describedby="alert-dialog-description"
        title={componentStrings.deletePost}
        actions={[
          { label: componentStrings.cancel, onClick: () => setOpenAreYouSureDialog(false) },
          {
            label: componentStrings.delete,
            onClick: async () => {
              await set(
                ref(
                  database,
                  `deleted/posts/teachers/${SUSANNA_USER_ID}/${postIdSelectedForDeletion}`
                ),
                ''
              )
              await remove(
                ref(database, `posts/teachers/${SUSANNA_USER_ID}/${postIdSelectedForDeletion}`)
              )
              setOpenAreYouSureDialog(false)
            }
          }
        ]}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {componentStrings.areYouSureDescription}
          </DialogContentText>
        </DialogContent>
      </MultiActionDialog>
    </>
  )
}
