package com.overseas.portal.service;

import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.Department;
import com.overseas.portal.domain.Team;
import com.overseas.portal.domain.User;
import com.overseas.portal.dto.DepartmentDto;
import com.overseas.portal.dto.OrgMemberDto;
import com.overseas.portal.dto.TeamDto;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.DepartmentRepository;
import com.overseas.portal.repository.TeamRepository;
import com.overseas.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * 조직 계층(해외교회/지역/개척지 > 부서 > 팀 > 회원) 관리 서비스. 최상위 단위는 /adminsetting/faith-records
 * (AdminFaithPage)에서 관리하는 Church(교회/지역/개척지) 목록을 그대로 사용한다 - 국가명을 별도로 묶지 않고
 * 그 목록에 있는 개별 항목 각각이 최상위 조직 단위다. 향후 결재선 자동 해석(예: "내 팀장"/"내 부서장")의
 * 기반 데이터를 제공하는 것이 목적이며, 이번 범위에서는 결재 로직 자체는 건드리지 않는다.
 */
@Service
@RequiredArgsConstructor
public class OrgStructureService {

    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final ChurchRepository churchRepository;

    @Transactional(readOnly = true)
    public List<DepartmentDto> getDepartments(Long churchId) {
        return departmentRepository.findByChurchIdOrderByNameAsc(churchId).stream()
                .map(this::toDepartmentDto)
                .toList();
    }

    /** 다른 화면(예: 회원 관리)에서 회원의 소속 부서/팀명을 표시하기 위한 전체 조회. */
    @Transactional(readOnly = true)
    public List<DepartmentDto> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::toDepartmentDto)
                .toList();
    }

    /** 다른 화면(예: 회원 관리)에서 회원의 소속 부서/팀명을 표시하기 위한 전체 조회. */
    @Transactional(readOnly = true)
    public List<TeamDto> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(this::toTeamDto)
                .toList();
    }

    @Transactional
    public DepartmentDto createDepartment(Long churchId, String name) {
        if (churchId == null || name == null || name.isBlank()) {
            throw new IllegalArgumentException("교회/지역/개척지와 부서명을 입력해주세요.");
        }
        if (!churchRepository.existsById(churchId)) {
            throw new IllegalArgumentException("교회/지역/개척지를 찾을 수 없습니다.");
        }
        Department department = Department.builder().churchId(churchId).name(name.trim()).build();
        try {
            return toDepartmentDto(departmentRepository.save(department));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("이미 같은 이름의 부서가 해당 항목에 존재합니다.");
        }
    }

    @Transactional
    public DepartmentDto renameDepartment(Long id, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("부서명을 입력해주세요.");
        }
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다."));
        department.setName(name.trim());
        try {
            return toDepartmentDto(departmentRepository.save(department));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("이미 같은 이름의 부서가 해당 항목에 존재합니다.");
        }
    }

    @Transactional
    public void deleteDepartment(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new IllegalArgumentException("부서를 찾을 수 없습니다.");
        }
        departmentRepository.deleteById(id);
    }

    @Transactional
    public DepartmentDto setDepartmentLeader(Long id, Long userId) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다."));
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
            if (!id.equals(user.getDepartmentId())) {
                throw new IllegalArgumentException("부서장으로 지정하려면 먼저 해당 부서 소속 회원으로 등록해야 합니다.");
            }
        }
        department.setLeaderUserId(userId);
        return toDepartmentDto(departmentRepository.save(department));
    }

    @Transactional(readOnly = true)
    public List<TeamDto> getTeams(Long departmentId) {
        return teamRepository.findByDepartmentIdOrderByNameAsc(departmentId).stream()
                .map(this::toTeamDto)
                .toList();
    }

    @Transactional
    public TeamDto createTeam(Long departmentId, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("팀명을 입력해주세요.");
        }
        if (!departmentRepository.existsById(departmentId)) {
            throw new IllegalArgumentException("부서를 찾을 수 없습니다.");
        }
        Team team = Team.builder().departmentId(departmentId).name(name.trim()).build();
        try {
            return toTeamDto(teamRepository.save(team));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("이미 같은 이름의 팀이 해당 부서에 존재합니다.");
        }
    }

    @Transactional
    public TeamDto renameTeam(Long id, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("팀명을 입력해주세요.");
        }
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다."));
        team.setName(name.trim());
        try {
            return toTeamDto(teamRepository.save(team));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("이미 같은 이름의 팀이 해당 부서에 존재합니다.");
        }
    }

    @Transactional
    public void deleteTeam(Long id) {
        if (!teamRepository.existsById(id)) {
            throw new IllegalArgumentException("팀을 찾을 수 없습니다.");
        }
        teamRepository.deleteById(id);
    }

    @Transactional
    public TeamDto setTeamLeader(Long id, Long userId) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다."));
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
            if (!id.equals(user.getTeamId())) {
                throw new IllegalArgumentException("팀장으로 지정하려면 먼저 해당 팀 소속 회원으로 등록해야 합니다.");
            }
        }
        team.setLeaderUserId(userId);
        return toTeamDto(teamRepository.save(team));
    }

    @Transactional(readOnly = true)
    public List<OrgMemberDto> getDepartmentMembers(Long departmentId) {
        return userRepository.findByDepartmentId(departmentId).stream()
                .map(this::toOrgMemberDto)
                .toList();
    }

    @Transactional
    public OrgMemberDto assignUser(Long userId, Long departmentId, Long teamId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        Long previousDepartmentId = user.getDepartmentId();
        Long previousTeamId = user.getTeamId();

        Long resolvedDepartmentId = departmentId;
        Long resolvedTeamId = teamId;

        if (resolvedDepartmentId == null) {
            // 부서 배정 해제 시 팀 배정도 함께 해제
            resolvedTeamId = null;
        } else if (resolvedTeamId != null) {
            Team team = teamRepository.findById(resolvedTeamId)
                    .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다."));
            if (!Objects.equals(team.getDepartmentId(), resolvedDepartmentId)) {
                throw new IllegalArgumentException("선택한 팀은 해당 부서에 속하지 않습니다.");
            }
        }

        user.setDepartmentId(resolvedDepartmentId);
        user.setTeamId(resolvedTeamId);
        User saved = userRepository.save(user);

        // 부서/팀 소속이 바뀌어 더 이상 그 조직 구성원이 아니게 되면, 리더로 남아있지 않도록 정리한다.
        // (그대로 두면 탈퇴/이동한 회원이 계속 "부서장/팀장"으로 표시되는 정합성 문제가 생긴다.)
        if (previousDepartmentId != null && !previousDepartmentId.equals(resolvedDepartmentId)) {
            clearDepartmentLeaderIfMatches(previousDepartmentId, userId);
        }
        if (previousTeamId != null && !previousTeamId.equals(resolvedTeamId)) {
            clearTeamLeaderIfMatches(previousTeamId, userId);
        }

        return toOrgMemberDto(saved);
    }

    private void clearDepartmentLeaderIfMatches(Long departmentId, Long userId) {
        departmentRepository.findById(departmentId).ifPresent(d -> {
            if (userId.equals(d.getLeaderUserId())) {
                d.setLeaderUserId(null);
                departmentRepository.save(d);
            }
        });
    }

    private void clearTeamLeaderIfMatches(Long teamId, Long userId) {
        teamRepository.findById(teamId).ifPresent(t -> {
            if (userId.equals(t.getLeaderUserId())) {
                t.setLeaderUserId(null);
                teamRepository.save(t);
            }
        });
    }

    private DepartmentDto toDepartmentDto(Department department) {
        String leaderName = department.getLeaderUserId() == null ? null
                : userRepository.findById(department.getLeaderUserId()).map(User::getName).orElse(null);
        String churchName = churchRepository.findById(department.getChurchId()).map(Church::getName).orElse(null);
        int teamCount = teamRepository.findByDepartmentIdOrderByNameAsc(department.getId()).size();
        int memberCount = userRepository.findByDepartmentId(department.getId()).size();
        return DepartmentDto.builder()
                .id(department.getId())
                .churchId(department.getChurchId())
                .churchName(churchName)
                .name(department.getName())
                .leaderUserId(department.getLeaderUserId())
                .leaderName(leaderName)
                .teamCount(teamCount)
                .memberCount(memberCount)
                .build();
    }

    private TeamDto toTeamDto(Team team) {
        String leaderName = team.getLeaderUserId() == null ? null
                : userRepository.findById(team.getLeaderUserId()).map(User::getName).orElse(null);
        long memberCount = userRepository.findByDepartmentId(team.getDepartmentId()).stream()
                .filter(u -> team.getId().equals(u.getTeamId()))
                .count();
        return TeamDto.builder()
                .id(team.getId())
                .departmentId(team.getDepartmentId())
                .name(team.getName())
                .leaderUserId(team.getLeaderUserId())
                .leaderName(leaderName)
                .memberCount((int) memberCount)
                .build();
    }

    private OrgMemberDto toOrgMemberDto(User user) {
        String teamName = user.getTeamId() == null ? null
                : teamRepository.findById(user.getTeamId()).map(Team::getName).orElse(null);
        return OrgMemberDto.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .name(user.getName())
                .role(user.getRole())
                .departmentId(user.getDepartmentId())
                .teamId(user.getTeamId())
                .teamName(teamName)
                .build();
    }
}
