import { Navigate, useParams } from "react-router-dom";

/** Редирект на страницу организатора в режиме модерации. */
const AdminEventPreview = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/organizer/events/${id}/edit?moderation=1`} replace />;
};

export default AdminEventPreview;
