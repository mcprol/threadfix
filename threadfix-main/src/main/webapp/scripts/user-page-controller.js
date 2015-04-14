var myAppModule = angular.module('threadfix')

// this is a shim for optional dependencies
myAppModule.value('deleteUrl', null);


myAppModule.controller('UserPageController', function ($scope, $modal, $http, $log, tfEncoder) {

    ////////////////////////////////////////////////////////////////////////////////
    //             Basic Page Functionality + $on(rootScopeInitialized)
    ////////////////////////////////////////////////////////////////////////////////

    var nameCompare = function(a,b) {
        return a.name.localeCompare(b.name);
    };

    $scope.numberToShow = 50;

    var reloadList = function() {
        $scope.initialized = false;

        $http.get(tfEncoder.encode('/configuration/users/map/page/' + $scope.page + '/' + $scope.numberToShow)).
            success(function(data) {

                if (data.success) {
                    $scope.countUsers = data.object.countUsers;
                    if (data.object.users.length > 0) {
                        $scope.users = data.object.users;
                        $scope.roles = data.object.roles;
                        $scope.users.sort(nameCompare);

                        $scope.teams = data.object.teams;
                        $scope.teams.sort(nameCompare);

                        $scope.teams.forEach(function(team) {
                            team.applications.sort(nameCompare);
                        });

                    } else {

                        // If the last page is no longer exist then refresh to page 1
                        if ($scope.page !== 1) {
                            $scope.page = 1;
                            reloadList();
                        }
                    }

                } else {
                    $scope.errorMessage = "Failure. Message was : " + data.message;
                }

                $scope.initialized = true;
            }).
            error(function(data, status, headers, config) {
                $scope.initialized = true;
                $scope.errorMessage = "Failed to retrieve user list. HTTP status was " + status;
            });
    };

    $scope.$on('rootScopeInitialized', function() {
        $scope.page = 1;
        reloadList();
    });

    $scope.goToEditPermissionsPage = function(user) {
        window.location.href = tfEncoder.encode("/configuration/users/" + user.id + "/permissions");
    };

    ////////////////////////////////////////////////////////////////////////////////
    //                              New User Modal
    ////////////////////////////////////////////////////////////////////////////////

    $scope.openNewModal = function() {
        var modalInstance = $modal.open({
            templateUrl: 'userForm.html',
            controller: 'UserModalController',
            resolve: {
                url: function() {
                    return tfEncoder.encode("/configuration/users/new");
                },
                user: function() {
                    return {};
                },
                roles: function() {
                    return $scope.roles
                }
            }
        });

        modalInstance.result.then(function (newUser) {
            reloadList();

            $scope.successMessage = "Successfully created user " + newUser.name;

        }, function () {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    ////////////////////////////////////////////////////////////////////////////////
    //                     Setting current user + updating data
    ////////////////////////////////////////////////////////////////////////////////

    // TODO consider "just adding this"
    var addMapsToUser = function(user) {
        $http.get(tfEncoder.encode('/configuration/users/' + user.id + '/permissions/map')).
            success(function(data) {

                if (data.success) {
                    user.maps = data.object.maps;
                } else {
                    $scope.errorMessage = "Failure. Message was : " + data.message;
                }

                $scope.initialized = true;
            }).
            error(function(data, status, headers, config) {
                $scope.initialized = true;
                $scope.errorMessage = "Failed to retrieve team list. HTTP status was " + status;
            });
    };

    $scope.updatePage = function(page) {
        $scope.page = page;
        reloadList();
    };

    $scope.setCurrentUser = function(user) {
        if (user.wasSelected) {
            $scope.currentUser = user.formUser;
        } else {
            $scope.currentUser = angular.copy(user);
            addMapsToUser($scope.currentUser);
            user.formUser = $scope.currentUser;
            user.wasSelected = true;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////
    //                              Update (Save Edits)
    ////////////////////////////////////////////////////////////////////////////////

    $scope.submitUpdate = function(valid) {
        if (!valid) {
            return;
        }

        $http.post(tfEncoder.encode("/configuration/users/" + $scope.currentUser.id + "/edit"), $scope.currentUser).
            success(function(data) {

                if (data.success) {
                    $scope.successMessage = "Edit succeeded.";

                    $scope.users = data.object;

                    var index = 0, targetIndex = -1;
                    $scope.users.forEach(function(listUser) {
                        if (listUser.id === $scope.currentUser.id) {
                            targetIndex = index;
                        }
                        index = index + 1;
                    });

                    $scope.setCurrentUser($scope.users[targetIndex]);
                } else {
                    $scope.errorMessage = "Failure. Message was : " + data.message;
                }

                $scope.initialized = true;
            }).
            error(function(data, status) {
                $scope.initialized = true;
                $scope.errorMessage = "Failed to retrieve user list. HTTP status was " + status;
            });
    };


    ////////////////////////////////////////////////////////////////////////////////
    //                            New Permissions Modals
    ////////////////////////////////////////////////////////////////////////////////

    $scope.openAddApplicationPermissionsModal = function() {
        openPermissionsModal(false);
    };

    $scope.openAddTeamPermissionsModal = function() {
        openPermissionsModal(true);
    };

    var openPermissionsModal = function(allApps) {

        if ($scope.teams.length) {
            var modalInstance = $modal.open({
                templateUrl: 'permissionForm.html',
                controller: 'PermissionModalController',
                resolve: {
                    url: function () {
                        return tfEncoder.encode("/configuration/users/" + $scope.currentUser.id + "/access/new");
                    },
                    object: function () {
                        return {
                            team: $scope.teams[0],
                            allApps: allApps,
                            application: {
                                id: 0
                            }, role: {
                                id: 0
                            }
                        };
                    },
                    buttonText: function () {
                        return "Save Map";
                    },
                    config: function () {
                        return {
                            teams: $scope.teams,
                            roles: $scope.roles
                        };
                    },
                    headerText: function () {
                        return allApps ? "Add Team Permission" : "Add Application Permissions";
                    }
                }
            });

            modalInstance.result.then(function (permissions) {

                addMapsToUser($scope.currentUser);

                $scope.successMessage = "Successfully added permissions.";

            }, function () {
                $log.info('Modal dismissed at: ' + new Date());
            });

        }

    };


});
