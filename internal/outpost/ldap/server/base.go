package server

import (
	"beryju.io/ldap"

	"goauthentik.io/api/v3"
	"goauthentik.io/internal/outpost/ldap/flags"
)

type LDAPServerInstance interface {
	GetAPIClient() *api.APIClient
	GetOutpostName() string

	GetAuthenticationFlowSlug() string
	GetInvalidationFlowSlug() *string
	GetAppSlug() string
	GetProviderID() int32

	UserEntry(u api.User) *ldap.Entry

	GetBaseDN() string
	GetBaseGroupDN() string
	GetBaseVirtualGroupDN() string
	GetBaseUserDN() string
	GetMFASupport() bool

	GetUserDN(string) string
	GetGroupDN(string) string
	GetVirtualGroupDN(string) string

	GetUserUidNumber(api.User) string
	GetUserGidNumber(api.User) string
	GetGroupGidNumber(api.Group) string

	UsersForGroup(api.Group) []string

	GetFlags(dn string) *flags.UserFlags
	SetFlags(dn string, flags *flags.UserFlags)

	GetNeededObjects(scope int, baseDN string, filterOC string) (bool, bool)
}
