import { Switch, Route, Router as WouterRouter, Redirect, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ServiceDetail from "@/pages/service-detail";
import ServicesConsulting from "@/pages/services-consulting";
import Academy from "@/pages/academy";
import AcademyIslamic from "@/pages/academy-islamic";
import AcademyManagement from "@/pages/academy-management";
import AcademyDigital from "@/pages/academy-digital";
import AcademyDiploma from "@/pages/academy-diploma";
import AcademyApply from "@/pages/academy-apply";
import AcademyRegister from "@/pages/academy-register";
import AcademyCareerPaths from "@/pages/academy-career-paths";
import AcademyForOrganizations from "@/pages/academy-for-organizations";
import AcademyDiplomas from "@/pages/academy-diplomas";
import AcademyCourses from "@/pages/academy-courses";
import Events from "@/pages/events";
import ServiceRegistration from "@/pages/service-registration";
import StoreBooksPage from "@/pages/store-books";
import StoreBookDetailPage from "@/pages/store-book-detail";
import StoreCoursesPage from "@/pages/store-courses";
import StoreCourseDetailPage from "@/pages/store-course-detail";
import Careers from "@/pages/careers";
import About from "@/pages/about";
import CaseStudies from "@/pages/case-studies";
import CaseStudyDetail from "@/pages/case-study-detail";
import PrivacyPolicyPage from "@/pages/privacy";
import TermsPage from "@/pages/terms";
import ReturnPolicyPage from "@/pages/return-policy";
import Services from "@/pages/services";
import Sectors from "@/pages/sectors";
import Contact from "@/pages/contact";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import SsoCallbackPage from "@/pages/sso-callback";
import ResetPasswordPage from "@/pages/reset-password";
import VerifyEmailPage from "@/pages/verify-email";
import AccountPage from "@/pages/account";
import AccountLibraryPage from "@/pages/account-library";
import OrderReaderPage from "@/pages/order-reader";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import CheckoutPayPalReturnPage from "@/pages/checkout-paypal-return";
import CheckoutPaymobPayPage from "@/pages/checkout-paymob-pay";
import CheckoutPaymobWalletPage from "@/pages/checkout-paymob-wallet";
import CheckoutManualPage from "@/pages/checkout-manual";
import { AdminGate } from "@/pages/admin/layout";
import AdminOverview from "@/pages/admin/overview";
import AdminBooks from "@/pages/admin/store/books";
import AdminStoreCourses from "@/pages/admin/store/store-courses";
import AdminAcademy from "@/pages/admin/academy/academy";
import AdminEvents from "@/pages/admin/events";
import AdminConsultationSlots from "@/pages/admin/consultation-slots";
import AdminConsultationBookings from "@/pages/admin/consultation-bookings";
import BookConsultationPage from "@/pages/book-consultation";
import AccountConsultationsPage from "@/pages/account-consultations";
import AdminOrders from "@/pages/admin/store/orders";
import AdminShipping from "@/pages/admin/store/shipping";
import AdminManualPayments from "@/pages/admin/store/manual-payments";
import AdminRegistrations from "@/pages/admin/academy/registrations";
import AdminServiceRegistrations from "@/pages/admin/service-registrations";
import AdminJobApplications from "@/pages/admin/people/job-applications";
import AdminJobs from "@/pages/admin/jobs";
import AdminAdmins from "@/pages/admin/people/admins";
import { LanguageProvider } from "@/lib/language-context";
import { CartProvider } from "@/lib/cart-context";
import { ScrollToTop } from "@/components/scroll-to-top";

const queryClient = new QueryClient();

function AdminRouter() {
  return (
    <AdminGate>
      <Switch>
        <Route path="/admin" component={AdminOverview} />
        <Route path="/admin/books" component={AdminBooks} />
        <Route path="/admin/store-courses" component={AdminStoreCourses} />
        <Route path="/admin/academy" component={AdminAcademy} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/consultation-slots" component={AdminConsultationSlots} />
        <Route path="/admin/consultation-bookings" component={AdminConsultationBookings} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/shipping" component={AdminShipping} />
        <Route path="/admin/manual-payments" component={AdminManualPayments} />
        <Route path="/admin/registrations" component={AdminRegistrations} />
        <Route path="/admin/service-registrations" component={AdminServiceRegistrations} />
        <Route path="/admin/jobs" component={AdminJobs} />
        <Route path="/admin/job-applications" component={AdminJobApplications} />
        <Route path="/admin/admins" component={AdminAdmins} />
        <Route component={NotFound} />
      </Switch>
    </AdminGate>
  );
}

// Legacy /rfp route now points at the single, simplified request form.
// Preserve any query string (e.g. ?service=...) so the dropdown pre-fills.
function RfpRedirect() {
  const search = useSearch();
  return <Redirect to={`/service-registration${search ? `?${search}` : ""}`} replace />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/case-studies" component={CaseStudies} />
      <Route path="/case-studies/:id" component={CaseStudyDetail} />
      <Route path="/نماذج-الأعمال" component={CaseStudies} />
      <Route path="/services" component={Services} />
      <Route path="/sectors" component={Sectors} />
      <Route path="/contact" component={Contact} />
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/return-policy" component={ReturnPolicyPage} />
      <Route path="/academy" component={Academy} />
      <Route path="/academy/islamic-systems" component={AcademyIslamic} />
      <Route path="/academy/professional-management" component={AcademyManagement} />
      <Route path="/academy/digital-transformation" component={AcademyDigital} />
      <Route path="/academy/integrated-diploma" component={AcademyDiploma} />
      <Route path="/academy/diplomas" component={AcademyDiplomas} />
      <Route path="/academy/courses" component={AcademyCourses} />
      <Route path="/academy/executive-education"><Redirect to="/academy/integrated-diploma" /></Route>
      <Route path="/academy/career-paths" component={AcademyCareerPaths} />
      <Route path="/academy/for-organizations" component={AcademyForOrganizations} />
      <Route path="/academy/apply" component={AcademyApply} />
      <Route path="/academy/register" component={AcademyRegister} />
      <Route path="/events" component={Events} />
      <Route path="/rfp" component={RfpRedirect} />
      <Route path="/service-registration" component={ServiceRegistration} />

      {/* Auth */}
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/:rest*" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-up/:rest*" component={SignUpPage} />
      <Route path="/sso-callback" component={SsoCallbackPage} />
      <Route path="/sso-callback/:rest*" component={SsoCallbackPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/account/library" component={AccountLibraryPage} />
      <Route path="/account/consultations" component={AccountConsultationsPage} />
      <Route path="/services/consulting/book" component={BookConsultationPage} />
      <Route path="/account/orders/:orderId/items/:itemId/read" component={OrderReaderPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/checkout/paypal/return" component={CheckoutPayPalReturnPage} />
      <Route path="/checkout/paypal/cancel"><Redirect to="/cart" /></Route>
      <Route path="/checkout/paymob/pay" component={CheckoutPaymobPayPage} />
      <Route path="/checkout/paymob/wallet" component={CheckoutPaymobWalletPage} />
      <Route path="/checkout/manual" component={CheckoutManualPage} />

      {/* Legacy redirects to new admin sections (must come before catch-all /admin) */}
      <Route path="/admin/store"><Redirect to="/admin/books" /></Route>
      <Route path="/admin/store-manager"><Redirect to="/admin/store-courses" /></Route>
      <Route path="/admin/courses"><Redirect to="/admin/store-courses" /></Route>
      <Route path="/admin/apps"><Redirect to="/admin/store-courses" /></Route>
      <Route path="/admin-academy"><Redirect to="/admin/academy" /></Route>
      <Route path="/admin-events"><Redirect to="/admin/events" /></Route>

      {/* Unified admin (role-gated by AdminGate) */}
      <Route path="/admin" component={AdminRouter} />
      <Route path="/admin/:rest*" component={AdminRouter} />

      <Route path="/services/store"><Redirect to="/services/store/books" /></Route>
      <Route path="/services/store/books" component={StoreBooksPage} />
      <Route path="/services/store/books/:id" component={StoreBookDetailPage} />
      <Route path="/services/store/courses" component={StoreCoursesPage} />
      <Route path="/services/store/courses/:id" component={StoreCourseDetailPage} />
      <Route path="/careers" component={Careers} />
      <Route path="/services/consulting" component={ServicesConsulting} />
      <Route path="/services/:slug" component={ServiceDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const basePath = (() => {
    const configured = import.meta.env.BASE_URL.replace(/\/$/, "");
    if (typeof window === "undefined" || !configured) return configured;
    return window.location.pathname.startsWith(configured + "/") ||
      window.location.pathname === configured
      ? configured
      : "";
  })();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <CartProvider>
            <WouterRouter base={basePath}>
              <ScrollToTop />
              <Router />
            </WouterRouter>
            <Toaster />
          </CartProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return <AppShell />;
}

export default App;
